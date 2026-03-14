/**
 * auth.routes.ts — Rutas de autenticación del SuperAdmin.
 * Montadas en /superadmin (ver index.ts).
 *
 * Públicas:
 *   POST /auth/login          → paso 1 (credenciales)
 *   POST /auth/logout
 *   POST /auth/2fa/login      → paso 2 (código TOTP)
 *
 * Protegidas (requireSuperAdmin):
 *   GET  /auth/me
 *   POST /auth/2fa/setup
 *   POST /auth/2fa/verify-setup
 *   POST /auth/2fa/disable
 */

import { Router } from 'express';

import { requireSuperAdmin }                           from '../../middleware/auth.middleware';
import { superAdminLoginLimiter }                      from '../../middleware/rateLimiter';
import { validateZod }                                 from '../../middleware/validate';
import { SuperAdminLoginSchema }                       from '../../middleware/schemas';
import * as authCtrl                                   from '../controllers/auth.controller';

const router = Router();

// ── Públicas ──────────────────────────────────────────────────────────────────
router.post('/auth/login',    superAdminLoginLimiter, validateZod(SuperAdminLoginSchema), authCtrl.postLogin);
router.post('/auth/logout',   authCtrl.postLogout);
router.post('/auth/2fa/login', superAdminLoginLimiter, authCtrl.postLogin2FAVerify);

// ── Protegidas ────────────────────────────────────────────────────────────────
router.get ('/auth/me',               requireSuperAdmin, authCtrl.getMe);
router.post('/auth/2fa/setup',        requireSuperAdmin, authCtrl.postSetup2FA);
router.post('/auth/2fa/verify-setup', requireSuperAdmin, authCtrl.postVerify2FA);
router.post('/auth/2fa/disable',      requireSuperAdmin, authCtrl.postDisable2FA);

export default router;
