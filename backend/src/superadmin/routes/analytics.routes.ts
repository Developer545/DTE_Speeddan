/**
 * analytics.routes.ts — Rutas de Analytics, Dashboard, Mapa, Health y Auditoría.
 * Montadas en /superadmin (ver index.ts).
 *
 * Todas protegidas con requireSuperAdmin:
 *   GET /dashboard
 *   GET /analytics
 *   GET /mapa
 *   GET /health
 *   GET /audit
 */

import { Router } from 'express';

import * as analyticsCtrl from '../controllers/analytics.controller';
import * as systemCtrl    from '../controllers/system.controller';

const router = Router();

router.get('/dashboard', analyticsCtrl.getDashboard);
router.get('/analytics', analyticsCtrl.getAnalytics);
router.get('/mapa',      analyticsCtrl.getMapaClientes);
router.get('/health',    systemCtrl.getHealth);
router.get('/audit',     analyticsCtrl.getAuditLog);

export default router;
