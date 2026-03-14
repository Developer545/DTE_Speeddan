/**
 * catalog.service.ts — Llamadas HTTP para CAT-012 Departamentos y CAT-013 Municipios.
 */

import api from './api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Departamento {
  id:     number;
  codigo: string;
  nombre: string;
}

export interface Municipio {
  id:                  number;
  codigo:              string;
  nombre:              string;
  departamento_id:     number;
  departamento_nombre: string;
}

// ── Departamentos ─────────────────────────────────────────────────────────────

export const getDepartamentos = (): Promise<Departamento[]> =>
  api.get('/catalogs/departamentos').then(r => r.data);

export const createDepartamento = (data: { codigo: string; nombre: string }): Promise<Departamento> =>
  api.post('/catalogs/departamentos', data).then(r => r.data);

export const updateDepartamento = (id: number, data: { codigo: string; nombre: string }): Promise<Departamento> =>
  api.put(`/catalogs/departamentos/${id}`, data).then(r => r.data);

export const deleteDepartamento = (id: number): Promise<void> =>
  api.delete(`/catalogs/departamentos/${id}`).then(() => {});

// ── Municipios ────────────────────────────────────────────────────────────────

export const getMunicipios = (departamentoId?: number): Promise<Municipio[]> =>
  api.get('/catalogs/municipios', { params: departamentoId ? { departamentoId } : undefined }).then(r => r.data);

export const createMunicipio = (data: { codigo: string; nombre: string; departamento_id: number }): Promise<Municipio> =>
  api.post('/catalogs/municipios', data).then(r => r.data);

export const updateMunicipio = (id: number, data: { codigo: string; nombre: string; departamento_id: number }): Promise<Municipio> =>
  api.put(`/catalogs/municipios/${id}`, data).then(r => r.data);

export const deleteMunicipio = (id: number): Promise<void> =>
  api.delete(`/catalogs/municipios/${id}`).then(() => {});
