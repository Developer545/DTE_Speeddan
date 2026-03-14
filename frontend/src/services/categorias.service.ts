/**
 * categorias.service.ts — Llamadas a la API REST para Categorias.
 */

import api from './api';
import {
  Categoria, CreateCategoriaDTO, UpdateCategoriaDTO, PaginatedCategorias,
} from '../types/categoria.types';

interface ListParams {
  search?: string;
  page?:   number;
  limit?:  number;
}

export const categoriasService = {
  /** Lista paginada y filtrada */
  getAll: (params: ListParams = {}): Promise<PaginatedCategorias> =>
    api.get('/categorias', { params }).then(r => r.data),

  /** Crear nueva categoría */
  create: (dto: CreateCategoriaDTO): Promise<Categoria> =>
    api.post('/categorias', dto).then(r => r.data),

  /** Actualizar categoría existente */
  update: (id: number, dto: UpdateCategoriaDTO): Promise<Categoria> =>
    api.put(`/categorias/${id}`, dto).then(r => r.data),

  /** Eliminar categoría */
  delete: (id: number): Promise<void> =>
    api.delete(`/categorias/${id}`).then(() => undefined),
};
