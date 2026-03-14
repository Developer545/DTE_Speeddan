/**
 * proveedor.routes.ts — Rutas para /api/proveedores
 */

import { Router } from 'express';
import * as ctrl from '../controllers/proveedor.controller';
import { validateBody } from '../middleware/validate';

const router = Router();

const createRules = [
  { field: 'nombre', required: true },
];

router.get('/',       ctrl.list);
router.post('/',      validateBody(createRules), ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
