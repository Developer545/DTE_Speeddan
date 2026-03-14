/**
 * categoria.controller.ts — Handlers HTTP para /api/categorias.
 * Solo mapea request → service → response. Sin lógica de negocio ni SQL.
 */

import { Request, Response, NextFunction } from 'express';
import * as categoriaService from '../services/categoria.service';
import { AppError } from '../middleware/errorHandler';

/** GET /api/categorias?search=&page=1&limit=10 */
export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const page   = parseInt(req.query.page  as string || '1',  10);
    const limit  = parseInt(req.query.limit as string || '10', 10);
    const search = (req.query.search as string) || '';

    const result = await categoriaService.getCategorias({ search, page, limit }, req.user!.tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** POST /api/categorias */
export async function create(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const categoria = await categoriaService.createCategoria(req.body, req.user!.tenantId);
    res.status(201).json(categoria);
  } catch (err) { next(err); }
}

/** PUT /api/categorias/:id */
export async function update(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const updated = await categoriaService.updateCategoria(id, req.body, req.user!.tenantId);
    if (!updated) return next(new AppError('Categoría no encontrada', 404));
    res.json(updated);
  } catch (err) { next(err); }
}

/** DELETE /api/categorias/:id */
export async function remove(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const deleted = await categoriaService.deleteCategoria(id, req.user!.tenantId);
    if (!deleted) return next(new AppError('Categoría no encontrada', 404));
    res.status(204).send();
  } catch (err) { next(err); }
}
