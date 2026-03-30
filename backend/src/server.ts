/**
 * server.ts — Punto de entrada del backend.
 * Carga env → inicializa DB → registra middleware y rutas → arranca el servidor.
 */

// npm install @sentry/node @sentry/profiling-node
import * as Sentry                  from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import 'dotenv/config';
import path          from 'path';
import express       from 'express';
import cors          from 'cors';
import cookieParser  from 'cookie-parser';
import helmet        from 'helmet';
import compression   from 'compression';

import { env }                from './config/env';
import { initializeDatabase, pool } from './config/database';
import routes                 from './routes/index';
import superAdminRoutes       from './superadmin/index';
import { errorHandler }       from './middleware/errorHandler';
import { generalApiLimiter }  from './middleware/rateLimiter';
import { initBillingJobs }    from './jobs/billing.job';
import { initBackupJobs }     from './jobs/backup.job';

// ── Sentry: inicializar ANTES de crear la app y cualquier middleware ──────────
// Solo se activa cuando SENTRY_DSN está definido (inactivo en desarrollo local).
Sentry.init({
  dsn:         process.env.SENTRY_DSN ?? '',
  environment: process.env.NODE_ENV ?? 'development',
  enabled:     !!process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate:   0.2,  // 20% de las transacciones en producción
  profilesSampleRate: 0.1,
});

const app = express();

// ── Trust proxy: Render usa proxy reverso (necesario para express-rate-limit) ─
app.set('trust proxy', 1);

// ── Sentry v8+: captura automática — no requiere requestHandler middleware ────
// El tracing de requests Express se configura automáticamente desde Sentry.init()

// ── Seguridad: headers HTTP ───────────────────────────────────────────────────
// Activa: X-Content-Type-Options, X-Frame-Options, HSTS, XSS Protection, etc.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite servir /uploads al frontend
}));

// ── Compresión gzip ───────────────────────────────────────────────────────────
// Reduce el tamaño de respuestas JSON un 60-80%
app.use(compression());

// ── CORS ─────────────────────────────────────────────────────────────────────
// Orígenes permitidos: localhost (dev) + Vercel (producción)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3100',  // speeddan-control dev
  'https://dte-speeddan.vercel.app',
  'https://speeddan-control.vercel.app',
  // Permite previews de Vercel (*.vercel.app) durante desarrollo
  /\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, callback) => {
    // Sin origin = petición directa (Postman, curl, server-to-server) → permitir
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(allowed ? null : new Error('CORS: origen no permitido'), allowed);
  },
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting general ─────────────────────────────────────────────────────
// 300 requests por IP cada 5 minutos — protección base contra scraping/DDoS
app.use('/api',        generalApiLimiter);
app.use('/superadmin', generalApiLimiter);

// ── Log de solicitudes (para debug) ────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// ── Archivos estáticos (imágenes de productos) ────────────────────────────────
// Sirve la carpeta /uploads en la raíz del proyecto como archivos estáticos.
// Acceso: GET /uploads/productos/nombre-archivo.jpg
const uploadsPath = path.join(__dirname, '..', '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// ── Rutas del ERP (por tenant) ────────────────────────────────────────────────
app.use('/api', routes);

// ── Rutas del panel SuperAdmin (ruta separada) ────────────────────────────────
// Completamente independiente del ERP. Usa cookie y JWT propios.
app.use('/superadmin', superAdminRoutes);

// Health check público — sin autenticación
app.get('/health', async (_req, res) => {
  const t0 = Date.now();
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbLatencyMs = -1;
  try {
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = 'error';
  }
  const mem = process.memoryUsage();
  res.json({
    status:          dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp:       new Date().toISOString(),
    uptime_seconds:  Math.floor(process.uptime()),
    database: {
      status:     dbStatus,
      latency_ms: dbLatencyMs,
    },
    memory: {
      rss_mb:        +(mem.rss       / 1024 / 1024).toFixed(1),
      heap_used_mb:  +(mem.heapUsed  / 1024 / 1024).toFixed(1),
      heap_total_mb: +(mem.heapTotal / 1024 / 1024).toFixed(1),
    },
  });
});

// ── Sentry v8+: captura de errores no manejados (ANTES de errorHandler) ───────
// setupExpressErrorHandler es el reemplazo de Sentry.Handlers.errorHandler()
Sentry.setupExpressErrorHandler(app);

// ── Error handler (debe ir DESPUÉS de todas las rutas) ────────────────────────
app.use(errorHandler);

// ── Arranque ──────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await initializeDatabase();
    app.listen(env.PORT, () => {
      console.log(`[Server] Corriendo en http://localhost:${env.PORT}`);
      console.log(`[Server] Entorno: ${env.NODE_ENV}`);
      initBillingJobs();
      initBackupJobs();
    });
  } catch (err) {
    console.error('[Server] Error al iniciar:', err);
    process.exit(1);
  }
}

bootstrap();
