/**
 * superadmin/index.ts — Router maestro del panel SuperAdmin.
 *
 * Montado en /superadmin desde server.ts.
 * Todas las rutas protegidas (exceptuando auth) requieren requireSuperAdmin,
 * aplicado en bloque con router.use() antes de los sub-routers de dominio.
 *
 * Sub-rutas por dominio:
 *   /auth/*         → auth.routes.ts      (login, logout, 2FA)
 *   /planes/*       → planes.routes.ts    (CRUD planes)
 *   /tenants/*      → tenants.routes.ts   (tenants + configuración completa)
 *   /dashboard,
 *   /analytics,
 *   /mapa,
 *   /health,
 *   /audit          → analytics.routes.ts
 *   /system/*       → system.routes.ts    (backups)
 */

import { Router } from 'express';

import { requireSuperAdmin } from '../middleware/auth.middleware';
import authRoutes            from './routes/auth.routes';
import planesRoutes          from './routes/planes.routes';
import tenantsRoutes         from './routes/tenants.routes';
import analyticsRoutes       from './routes/analytics.routes';
import systemRoutes          from './routes/system.routes';

const router = Router();

// ── Rutas de autenticación (públicas + protegidas propias) ────────────────────
// auth.routes.ts gestiona internamente qué rutas requieren requireSuperAdmin
router.use(authRoutes);

// ── Todas las rutas siguientes requieren sesión activa de superadmin ──────────
router.use(requireSuperAdmin);

router.use(planesRoutes);
router.use(tenantsRoutes);
router.use(analyticsRoutes);
router.use(systemRoutes);

export default router;
