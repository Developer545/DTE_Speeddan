/**
 * planes.routes.ts — Rutas de Planes del SuperAdmin.
 * Montadas en /superadmin (ver index.ts).
 *
 * Todas protegidas con requireSuperAdmin:
 *   GET    /planes
 *   POST   /planes
 *   PUT    /planes/:id
 *   DELETE /planes/:id
 */

import { Router } from 'express';

import { validateZod }   from '../../middleware/validate';
import { CreatePlanSchema } from '../../middleware/schemas';
import * as planesCtrl   from '../controllers/planes.controller';

const router = Router();

router.get   ('/planes',     planesCtrl.getPlanes);
router.post  ('/planes',     validateZod(CreatePlanSchema), planesCtrl.postPlan);
router.put   ('/planes/:id', planesCtrl.putPlan);
router.delete('/planes/:id', planesCtrl.deletePlan);

export default router;
