/**
 * system.routes.ts — Rutas de Sistema (Backups).
 * Montadas en /superadmin (ver index.ts).
 *
 * Todas protegidas con requireSuperAdmin:
 *   GET  /system/backups
 *   POST /system/backups/run
 */

import { Router } from 'express';
import * as systemCtrl from '../controllers/system.controller';

const router = Router();

router.get ('/system/backups',     systemCtrl.getBackups);
router.post('/system/backups/run', systemCtrl.postRunBackup);

export default router;
