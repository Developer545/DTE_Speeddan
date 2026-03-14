/**
 * clientes.service.ts — Llamadas a la API REST para Clientes.
 */

import api from './api';
import {
  Cliente, CreateClienteDTO, UpdateClienteDTO, PaginatedClientes,
} from '../types/cliente.types';

interface ListParams {
  search?: string;
  page?:   number;
  limit?:  number;
}

export const clientesService = {
  /** Lista paginada y filtrada */
  getAll: (params: ListParams = {}): Promise<PaginatedClientes> =>
    api.get('/clientes', { params }).then(r => r.data),

  /** Crear nuevo cliente */
  create: (dto: CreateClienteDTO): Promise<Cliente> =>
    api.post('/clientes', dto).then(r => r.data),

  /** Actualizar cliente existente */
  update: (id: number, dto: UpdateClienteDTO): Promise<Cliente> =>
    api.put(`/clientes/${id}`, dto).then(r => r.data),

  /** Eliminar cliente */
  delete: (id: number): Promise<void> =>
    api.delete(`/clientes/${id}`).then(() => undefined),
};
