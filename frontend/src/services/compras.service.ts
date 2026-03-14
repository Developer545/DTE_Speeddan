/**
 * compras.service.ts — Llamadas a la API REST para Compras.
 */

import api from './api';
import {
  CompraConDetalle, CreateCompraDTO, PaginatedCompras,
} from '../types/compra.types';

interface ListParams {
  search?: string;
  page?:   number;
  limit?:  number;
}

export const comprasService = {
  getAll: (params: ListParams = {}): Promise<PaginatedCompras> =>
    api.get('/compras', { params }).then(r => r.data),

  getById: (id: number): Promise<CompraConDetalle> =>
    api.get(`/compras/${id}`).then(r => r.data),

  create: (dto: CreateCompraDTO): Promise<CompraConDetalle> =>
    api.post('/compras', dto).then(r => r.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/compras/${id}`).then(() => undefined),
};
