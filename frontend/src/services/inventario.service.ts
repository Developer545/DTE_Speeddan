/**
 * inventario.service.ts — Llamadas a la API REST para Inventario.
 */

import api from './api';
import {
  Inventario,
  PaginatedInventario,
  MovimientoKardex,
  AlertaStock,
  TipoAjuste,
} from '../types/inventario.types';

interface ListParams {
  search?: string;
  page?:   number;
  limit?:  number;
}

export interface AjustePayload {
  inventario_id: number;
  tipo:          TipoAjuste;
  cantidad:      number;
  motivo?:       string;
}

export const inventarioService = {
  getAll: (params: ListParams = {}): Promise<PaginatedInventario> =>
    api.get('/inventario', { params }).then(r => r.data),

  getKardex: (productoId: number): Promise<MovimientoKardex[]> =>
    api.get(`/inventario/kardex/${productoId}`).then(r => r.data),

  getAlertas: (): Promise<AlertaStock[]> =>
    api.get('/inventario/alertas').then(r => r.data),

  postAjuste: (payload: AjustePayload): Promise<void> =>
    api.post('/inventario/ajuste', payload).then(r => r.data),
};
