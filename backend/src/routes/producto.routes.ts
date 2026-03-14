/**
 * producto.routes.ts — Rutas para /api/productos
 * Usa multer (upload.single) para recibir la imagen del producto.
 */

import { Router } from 'express';
import * as ctrl from '../controllers/producto.controller';

const router = Router();

router.get('/',       ctrl.list);
router.post('/',      ctrl.upload.single('imagen'), ctrl.create);
router.put('/:id',    ctrl.upload.single('imagen'), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
