/**
 * categoria.routes.ts — Rutas para /api/categorias
 */

import { Router } from 'express';
import * as ctrl from '../controllers/categoria.controller';
import { validateBody } from '../middleware/validate';

const router = Router();

/** Reglas de validación para crear una categoría */
const createRules = [
  { field: 'nombre', required: true },
];

router.get('/',       ctrl.list);
router.post('/',      validateBody(createRules), ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
