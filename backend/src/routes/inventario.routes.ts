/**
 * inventario.routes.ts — Rutas para /api/inventario
 */

import { Router } from 'express';
import * as ctrl from '../controllers/inventario.controller';

const router = Router();

router.get('/alertas',            ctrl.getAlertasStock);      // FASE 7A — antes de /:id
router.get('/kardex/:productoId', ctrl.getKardexProducto);    // FASE 7A
router.post('/ajuste',            ctrl.postAjuste);            // FASE 7A
router.get('/lotes/:productoId',  ctrl.getLotes);
router.get('/',                   ctrl.list);

export default router;
