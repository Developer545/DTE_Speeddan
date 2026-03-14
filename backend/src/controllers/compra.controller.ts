/**
 * compra.controller.ts — Handlers HTTP para /api/compras.
 */

import { Request, Response, NextFunction } from 'express';
import * as compraService from '../services/compra.service';
import { AppError } from '../middleware/errorHandler';

/** GET /api/compras?search=&page=1&limit=10 */
export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const page   = parseInt(req.query.page  as string || '1',  10);
    const limit  = parseInt(req.query.limit as string || '10', 10);
    const search = (req.query.search as string) || '';
    const result = await compraService.getCompras({ search, page, limit }, req.user!.tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** POST /api/compras */
export async function create(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const compra = await compraService.createCompra(req.body, req.user!.tenantId);
    res.status(201).json(compra);
  } catch (err) { next(err); }
}

/** GET /api/compras/:id */
export async function getById(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id     = parseInt(req.params.id as string, 10);
    const compra = await compraService.getCompraById(id, req.user!.tenantId);
    if (!compra) return next(new AppError('Compra no encontrada', 404));
    res.json(compra);
  } catch (err) { next(err); }
}

/** DELETE /api/compras/:id */
export async function remove(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const deleted = await compraService.deleteCompra(id, req.user!.tenantId);
    if (!deleted) return next(new AppError('Compra no encontrada', 404));
    res.status(204).send();
  } catch (err) { next(err); }
}
