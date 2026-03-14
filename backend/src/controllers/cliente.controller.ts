/**
 * cliente.controller.ts — Handlers HTTP para /api/clientes.
 * Solo mapea request → service → response. Sin lógica de negocio ni SQL.
 */

import { Request, Response, NextFunction } from 'express';
import * as clienteService from '../services/cliente.service';
import { AppError } from '../middleware/errorHandler';

/** GET /api/clientes?search=&page=1&limit=10 */
export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const page   = parseInt(req.query.page  as string || '1',  10);
    const limit  = parseInt(req.query.limit as string || '10', 10);
    const search = (req.query.search as string) || '';

    const result = await clienteService.getClientes({ search, page, limit }, req.user!.tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** POST /api/clientes */
export async function create(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const cliente = await clienteService.createCliente(req.body, req.user!.tenantId);
    res.status(201).json(cliente);
  } catch (err) { next(err); }
}

/** PUT /api/clientes/:id */
export async function update(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const updated = await clienteService.updateCliente(id, req.body, req.user!.tenantId);
    if (!updated) return next(new AppError('Cliente no encontrado', 404));
    res.json(updated);
  } catch (err) { next(err); }
}

/** DELETE /api/clientes/:id */
export async function remove(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id      = parseInt(req.params.id as string, 10);
    const deleted = await clienteService.deleteCliente(id, req.user!.tenantId);
    if (!deleted) return next(new AppError('Cliente no encontrado', 404));
    res.status(204).send();
  } catch (err) { next(err); }
}
