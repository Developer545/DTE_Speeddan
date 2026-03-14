/**
 * productos.service.ts — Llamadas a la API REST para Productos.
 *
 * Implementa CRUDService<Producto, CreateProductoDTO>.
 * Los campos de texto + la imagen File se envían como multipart/form-data.
 */

import api from './api';
import {
  Producto, CreateProductoDTO, UpdateProductoDTO, PaginatedProductos,
} from '../types/producto.types';

interface ListParams {
  search?: string;
  page?:   number;
  limit?:  number;
}

/** Construye FormData extrayendo `imagen` del DTO y agregando el resto de campos. */
function buildFormData(dto: CreateProductoDTO | UpdateProductoDTO): FormData {
  const { imagen, ...fields } = dto as CreateProductoDTO;
  const fd = new FormData();

  if (fields.nombre !== undefined)       fd.append('nombre',       fields.nombre);
  if (fields.categoria_id !== undefined)
    fd.append('categoria_id', fields.categoria_id == null ? '' : String(fields.categoria_id));
  if (imagen instanceof File)            fd.append('imagen', imagen);

  return fd;
}

export const productosService = {
  /** Lista paginada y filtrada */
  getAll: (params: ListParams = {}): Promise<PaginatedProductos> =>
    api.get('/productos', { params }).then(r => r.data),

  /** Crear producto (con imagen opcional). */
  create: (dto: CreateProductoDTO): Promise<Producto> =>
    api.post('/productos', buildFormData(dto), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  /** Actualizar producto (imagen opcional — si no se envía, el servidor la conserva). */
  update: (id: number, dto: UpdateProductoDTO): Promise<Producto> =>
    api.put(`/productos/${id}`, buildFormData(dto), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  /** Eliminar producto (también borra la imagen en el servidor). */
  delete: (id: number): Promise<void> =>
    api.delete(`/productos/${id}`).then(() => undefined),
};
