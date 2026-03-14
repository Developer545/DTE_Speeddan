/**
 * proveedor.controller.ts — Handlers HTTP para /api/proveedores.
 */

import { Request, Response, NextFunction } from 'express';
import * as proveedorService from '../services/proveedor.service';
import { AppError } from '../middleware/errorHandler';

/** GET /api/proveedores?search=&page=1&limit=10 */
export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const page   = parseInt(req.query.page  as string || '1',  10);
    const limit  = parseInt(req.query.limit as string || '10', 10);
    const search = (req.query.search as string) || '';

    const result = await proveedorService.getProveedores({ search, page, limit }, req.user!.tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** POST /api/proveedores */
export async function create(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const proveedor = await proveedorService.createProveedor(req.body, req.user!.tenantId);
    res.status(201).json(proveedor);
  } catch (err) { next(err); }
}

/** PUT /api/proveedores/:id */
export async function update(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const updated = await proveedorService.updateProveedor(id, req.body, req.user!.tenantId);
    if (!updated) return next(new AppError('Proveedor no encontrado', 404));
    res.json(updated);
  } catch (err) { next(err); }
}

/** DELETE /api/proveedores/:id */
export async function remove(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const deleted = await proveedorService.deleteProveedor(id, req.user!.tenantId);
    if (!deleted) return next(new AppError('Proveedor no encontrado', 404));
    res.status(204).send();
  } catch (err) { next(err); }
}
