/**
 * system.controller.ts — Handlers HTTP para Health Check y Backups.
 *
 * Rutas:
 *   GET  /superadmin/health             → getHealth
 *   GET  /superadmin/system/backups     → getBackups
 *   POST /superadmin/system/backups/run → postRunBackup
 */

import { Request, Response, NextFunction } from 'express';
import * as systemService from '../services/system.service';

// ── Health Check ──────────────────────────────────────────────────────────────

/**
 * GET /superadmin/health
 * Estado detallado del sistema: DB, pool, proceso Node.js, conteo de tenants.
 * Solo accesible por superadmin autenticado.
 */
export async function getHealth(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await systemService.getHealth();
    res.json(data);
  } catch (err) { next(err); }
}

// ── Backups ────────────────────────────────────────────────────────────────────

/** GET /superadmin/system/backups — Lista archivos de backup con estadísticas. */
export async function getBackups(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = systemService.getBackups();
    res.json(data);
  } catch (err) { next(err); }
}

/**
 * POST /superadmin/system/backups/run
 * Dispara un backup manual inmediato. Responde 202 Accepted de inmediato
 * y ejecuta el backup en background para no bloquear la respuesta HTTP.
 */
export function postRunBackup(
  _req: Request, res: Response,
): void {
  res.status(202).json({ message: 'Backup iniciado. Consulta el historial en unos segundos.' });
  systemService.runBackupInBackground();
}
