/**
 * catalog.controller.ts — Handlers HTTP para /api/catalogs
 *
 *  GET    /departamentos              → listDepartamentos
 *  POST   /departamentos              → addDepartamento
 *  PUT    /departamentos/:id          → editDepartamento
 *  DELETE /departamentos/:id          → removeDepartamento
 *
 *  GET    /municipios?departamentoId= → listMunicipios
 *  POST   /municipios                 → addMunicipio
 *  PUT    /municipios/:id             → editMunicipio
 *  DELETE /municipios/:id             → removeMunicipio
 */

import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/catalog.service';
import { AppError } from '../middleware/errorHandler';

// ── Departamentos ──────────────────────────────────────────────────────────────

export async function listDepartamentos(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getDepartamentos()); }
  catch (e) { next(e); }
}

export async function addDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo, nombre } = req.body;
    if (!codigo?.trim() || !nombre?.trim()) throw new AppError('Código y nombre son requeridos', 400);
    res.status(201).json(await svc.createDepartamento(codigo, nombre));
  } catch (e) { next(e); }
}

export async function editDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo, nombre } = req.body;
    if (!codigo?.trim() || !nombre?.trim()) throw new AppError('Código y nombre son requeridos', 400);
    const updated = await svc.updateDepartamento(Number(req.params.id), codigo, nombre);
    if (!updated) throw new AppError('Departamento no encontrado', 404);
    res.json(updated);
  } catch (e) { next(e); }
}

export async function removeDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteDepartamento(Number(req.params.id));
    res.status(204).end();
  } catch (e) { next(e); }
}

// ── Municipios ─────────────────────────────────────────────────────────────────

export async function listMunicipios(req: Request, res: Response, next: NextFunction) {
  try {
    const depId = req.query.departamentoId ? Number(req.query.departamentoId) : undefined;
    res.json(await svc.getMunicipios(depId));
  } catch (e) { next(e); }
}

export async function addMunicipio(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo, nombre, departamento_id } = req.body;
    if (!codigo?.trim() || !nombre?.trim() || !departamento_id)
      throw new AppError('Código, nombre y departamento son requeridos', 400);
    res.status(201).json(await svc.createMunicipio(codigo, nombre, Number(departamento_id)));
  } catch (e) { next(e); }
}

export async function editMunicipio(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo, nombre, departamento_id } = req.body;
    if (!codigo?.trim() || !nombre?.trim() || !departamento_id)
      throw new AppError('Código, nombre y departamento son requeridos', 400);
    const updated = await svc.updateMunicipio(Number(req.params.id), codigo, nombre, Number(departamento_id));
    if (!updated) throw new AppError('Municipio no encontrado', 404);
    res.json(updated);
  } catch (e) { next(e); }
}

export async function removeMunicipio(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteMunicipio(Number(req.params.id));
    res.status(204).end();
  } catch (e) { next(e); }
}
