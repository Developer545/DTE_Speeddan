/**
 * rateLimiter.ts — Rate limiters para endpoints críticos.
 *
 * Usa memoria en proceso (sin Redis).  Suficiente para 50-200 tenants.
 * Si en el futuro se escala a múltiples instancias, cambiar `windowMs`
 * store por RedisStore (express-rate-limit lo soporta).
 */

import rateLimit from 'express-rate-limit';

// ── Mensaje de error estándar ──────────────────────────────────────────────────

function limitMessage(action: string, minutes: number) {
  return {
    message: `Demasiados intentos de ${action}. Intenta de nuevo en ${minutes} minutos.`,
  };
}

// ── Login superadmin ───────────────────────────────────────────────────────────
// 3 intentos por IP cada 15 minutos — más estricto por ser cuenta de máximo privilegio
export const superAdminLoginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              3,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          limitMessage('inicio de sesión de administrador', 15),
  skipSuccessfulRequests: true,
});

// ── Login tenant ───────────────────────────────────────────────────────────────
// 10 intentos por IP cada 15 minutos
export const tenantLoginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          limitMessage('inicio de sesión', 15),
  skipSuccessfulRequests: true,
});

// ── Crear tenant (superadmin) ─────────────────────────────────────────────────
// 20 creaciones por IP por hora — previene abuso de la API
export const createTenantLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          limitMessage('creación de empresa', 60),
});

// ── Emisión de facturas ────────────────────────────────────────────────────────
// 60 facturas por IP cada 10 minutos — previene generación masiva accidental
export const facturacionLimiter = rateLimit({
  windowMs:         10 * 60 * 1000,
  max:              60,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          limitMessage('emisión de facturas', 10),
});

// ── Descarga de JSON DTE ───────────────────────────────────────────────────────
// 100 descargas por IP cada 10 minutos — previene scraping masivo de documentos
export const jsonDteLimiter = rateLimit({
  windowMs:         10 * 60 * 1000,
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          limitMessage('descarga de documentos DTE', 10),
});

// ── API general ────────────────────────────────────────────────────────────────
// 300 requests por IP cada 5 minutos — protección global contra scraping/DDoS
export const generalApiLimiter = rateLimit({
  windowMs:         5 * 60 * 1000,
  max:              300,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { message: 'Demasiadas solicitudes. Intenta en unos minutos.' },
});
