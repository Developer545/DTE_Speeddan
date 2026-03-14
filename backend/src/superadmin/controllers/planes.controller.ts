/**
 * planes.controller.ts — Handlers HTTP para la gestión de Planes.
 *
 * Rutas:
 *   GET    /superadmin/planes     → getPlanes
 *   POST   /superadmin/planes     → postPlan
 *   PUT    /superadmin/planes/:id → putPlan
 *   DELETE /superadmin/planes/:id → deletePlan
 */

import { Request, Response, NextFunction } from 'express';
import * as planesService from '../services/planes.service';

// ── Consultas ─────────────────────────────────────────────────────────────────

/** GET /superadmin/planes — Lista todos los planes de suscripción. */
export async function getPlanes(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const planes = await planesService.getPlanes();
    res.json(planes);
  } catch (err) { next(err); }
}

// ── Mutaciones ────────────────────────────────────────────────────────────────

/** POST /superadmin/planes — Crea un nuevo plan. */
export async function postPlan(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const plan = await planesService.createPlan(req.body);
    res.status(201).json(plan);
  } catch (err) { next(err); }
}

/** PUT /superadmin/planes/:id — Actualiza un plan existente. */
export async function putPlan(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id   = parseInt(req.params.id as string, 10);
    const plan = await planesService.updatePlan(id, req.body);
    res.json(plan);
  } catch (err) { next(err); }
}

/** DELETE /superadmin/planes/:id — Elimina un plan. */
export async function deletePlan(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    await planesService.deletePlan(parseInt(req.params.id as string, 10));
    res.status(204).send();
  } catch (err) { next(err); }
}
