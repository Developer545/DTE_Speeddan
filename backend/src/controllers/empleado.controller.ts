/**
 * empleado.controller.ts — Handlers HTTP para /api/empleados.
 * Solo mapea request → service → response. Sin lógica de negocio ni SQL.
 */

import { Request, Response, NextFunction } from 'express';
import * as empleadoService from '../services/empleado.service';
import { AppError } from '../middleware/errorHandler';

/** GET /api/empleados?search=&page=1&limit=10 */
export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const page   = parseInt(req.query.page  as string || '1',  10);
    const limit  = parseInt(req.query.limit as string || '10', 10);
    const search = (req.query.search as string) || '';

    const result = await empleadoService.getEmpleados({ search, page, limit }, req.user!.tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** POST /api/empleados */
export async function create(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const empleado = await empleadoService.createEmpleado(req.body, req.user!.tenantId);
    res.status(201).json(empleado);
  } catch (err) { next(err); }
}

/** PUT /api/empleados/:id */
export async function update(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const updated = await empleadoService.updateEmpleado(id, req.body, req.user!.tenantId);
    if (!updated) return next(new AppError('Empleado no encontrado', 404));
    res.json(updated);
  } catch (err) { next(err); }
}

/** DELETE /api/empleados/:id */
export async function remove(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const deleted = await empleadoService.deleteEmpleado(id, req.user!.tenantId);
    if (!deleted) return next(new AppError('Empleado no encontrado', 404));
    res.status(204).send();
  } catch (err) { next(err); }
}
