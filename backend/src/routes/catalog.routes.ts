/**
 * catalog.routes.ts — Rutas para /api/catalogs
 */

import { Router } from 'express';
import * as ctrl from '../controllers/catalog.controller';

const router = Router();

// Departamentos (CAT-012)
router.get   ('/departamentos',     ctrl.listDepartamentos);
router.post  ('/departamentos',     ctrl.addDepartamento);
router.put   ('/departamentos/:id', ctrl.editDepartamento);
router.delete('/departamentos/:id', ctrl.removeDepartamento);

// Municipios (CAT-013)
router.get   ('/municipios',     ctrl.listMunicipios);
router.post  ('/municipios',     ctrl.addMunicipio);
router.put   ('/municipios/:id', ctrl.editMunicipio);
router.delete('/municipios/:id', ctrl.removeMunicipio);

export default router;
