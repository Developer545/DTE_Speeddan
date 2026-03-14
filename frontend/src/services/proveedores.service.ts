/**
 * proveedores.service.ts — Llamadas a la API REST para Proveedores.
 */

import api from './api';
import {
  Proveedor, CreateProveedorDTO, UpdateProveedorDTO, PaginatedProveedores,
} from '../types/proveedor.types';

interface ListParams {
  search?: string;
  page?:   number;
  limit?:  number;
}

export const proveedoresService = {
  getAll: (params: ListParams = {}): Promise<PaginatedProveedores> =>
    api.get('/proveedores', { params }).then(r => r.data),

  create: (dto: CreateProveedorDTO): Promise<Proveedor> =>
    api.post('/proveedores', dto).then(r => r.data),

  update: (id: number, dto: UpdateProveedorDTO): Promise<Proveedor> =>
    api.put(`/proveedores/${id}`, dto).then(r => r.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/proveedores/${id}`).then(() => undefined),
};
