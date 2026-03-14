/**
 * empleado.routes.ts — Rutas para /api/empleados
 */

import { Router } from 'express';
import * as ctrl from '../controllers/empleado.controller';
import { validateBody } from '../middleware/validate';

const router = Router();

/** Reglas de validación para crear un empleado */
const createRules = [
  { field: 'nombre_completo',  required: true },
  { field: 'tipo_documento',   required: true, allowedValues: ['DUI', 'Pasaporte', 'Otro'] },
  { field: 'numero_documento', required: true },
];

router.get('/',       ctrl.list);
router.post('/',      validateBody(createRules), ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
