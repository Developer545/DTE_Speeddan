/**
 * inventario.controller.ts — Handlers HTTP para /api/inventario.
 *
 * GET  /                        — lista paginada
 * GET  /lotes/:productoId       — lotes disponibles para POS
 * POST /ajuste                  — ajuste manual (FASE 7A)
 * GET  /kardex/:productoId      — historial kardex (FASE 7A)
 * GET  /alertas                 — productos bajo stock mínimo (FASE 7A)
 */

import { Request, Response, NextFunction } from 'express';
import * as inventarioService from '../services/inventario.service';
import { AppError } from '../middleware/errorHandler';

/** GET /api/inventario/lotes/:productoId */
export async function getLotes(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const productoId = parseInt(req.params.productoId as string, 10);
    if (isNaN(productoId)) { res.status(400).json({ message: 'ID inválido' }); return; }
    const lotes = await inventarioService.getLotesPorProducto(productoId, req.user!.tenantId);
    res.json(lotes);
  } catch (err) { next(err); }
}

/** GET /api/inventario?search=&page=1&limit=10 */
export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const page   = parseInt(req.query.page  as string || '1',  10);
    const limit  = parseInt(req.query.limit as string || '10', 10);
    const search = (req.query.search as string) || '';
    const result = await inventarioService.getInventario({ search, page, limit }, req.user!.tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** POST /api/inventario/ajuste — ajuste manual de stock */
export async function postAjuste(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { inventario_id, tipo, cantidad, motivo } = req.body;

    if (!inventario_id || !tipo || !cantidad) {
      throw new AppError('Campos requeridos: inventario_id, tipo, cantidad', 400);
    }
    if (Number(cantidad) <= 0) {
      throw new AppError('La cantidad debe ser mayor a cero', 400);
    }
    const tiposValidos = ['merma', 'dano', 'robo', 'correccion_positiva', 'correccion_negativa'];
    if (!tiposValidos.includes(tipo)) {
      throw new AppError(`Tipo de ajuste inválido. Válidos: ${tiposValidos.join(', ')}`, 400);
    }

    await inventarioService.crearAjuste(
      { inventario_id: Number(inventario_id), tipo, cantidad: Number(cantidad), motivo },
      req.user!.tenantId,
      req.user!.id
    );

    res.status(201).json({ message: 'Ajuste registrado correctamente' });
  } catch (err) { next(err); }
}

/** GET /api/inventario/kardex/:productoId */
export async function getKardexProducto(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const productoId = parseInt(req.params.productoId as string, 10);
    if (isNaN(productoId)) { res.status(400).json({ message: 'ID inválido' }); return; }
    const movimientos = await inventarioService.getKardex(productoId, req.user!.tenantId);
    res.json(movimientos);
  } catch (err) { next(err); }
}

/** GET /api/inventario/alertas — productos bajo stock mínimo */
export async function getAlertasStock(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const alertas = await inventarioService.getAlertasStock(req.user!.tenantId);
    res.json(alertas);
  } catch (err) { next(err); }
}
