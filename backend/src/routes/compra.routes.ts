/**
 * compra.routes.ts — Rutas para /api/compras
 */

import { Router } from 'express';
import * as ctrl from '../controllers/compra.controller';

const router = Router();

router.get('/',     ctrl.list);
router.post('/',    ctrl.create);
router.get('/:id',  ctrl.getById);
router.delete('/:id', ctrl.remove);

export default router;
