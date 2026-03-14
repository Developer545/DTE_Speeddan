/**
 * auth.routes.ts — Rutas públicas y protegidas de autenticación del ERP.
 *
 *  GET  /api/auth/tenant/:slug → verifica slug de empresa (para el login)
 *  POST /api/auth/login        → recibe tenant_slug + username + password
 *  POST /api/auth/logout       → limpia cookie
 *  GET  /api/auth/me           → requireAuth (devuelve usuario actual con tenantId)
 */

import { Router } from 'express';
import { getTenant, postLogin, postLogout, getMe, postImpersonateLogin } from '../controllers/auth.controller';
import { requireAuth }        from '../middleware/auth.middleware';
import { tenantLoginLimiter } from '../middleware/rateLimiter';
import { validateZod }        from '../middleware/validate';
import { TenantLoginSchema }  from '../middleware/schemas';

const router = Router();

router.get('/tenant/:slug',   getTenant);
router.post('/login',         tenantLoginLimiter, validateZod(TenantLoginSchema), postLogin);
router.post('/logout',        postLogout);
router.get('/me',             requireAuth, getMe);
router.post('/impersonate',   postImpersonateLogin);

export default router;
