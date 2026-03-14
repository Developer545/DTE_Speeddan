/**
 * producto.types.ts — Tipos TypeScript para la entidad Producto.
 *
 * NOTA: imagen se incluye en el DTO para compatibilidad con useGenericCRUD.
 * El servicio extrae el File y lo envía como multipart/form-data.
 */

export interface Producto {
  id:               number;
  nombre:           string;
  categoria_id:     number | null;
  categoria_nombre: string | null;
  imagen_url:       string | null;
  created_at:       string;
  updated_at:       string;
}

/**
 * DTO para crear/actualizar un producto.
 * `imagen` es un File del input; el servicio lo extrae y construye FormData.
 */
export interface CreateProductoDTO {
  nombre:       string;
  categoria_id?: number | null;
  /** Solo en frontend — no se serializa como JSON. */
  imagen?:      File | null;
}

export type UpdateProductoDTO = Partial<CreateProductoDTO>;

export interface PaginatedProductos {
  data:       Producto[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
