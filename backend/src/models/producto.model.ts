/**
 * producto.model.ts — Interfaces TypeScript para la entidad Producto.
 *
 * Para agregar un campo nuevo:
 *   1. Agrega la columna en database.ts (CREATE TABLE)
 *   2. Agrega el campo aquí en Producto y CreateProductoDTO
 *   3. Agrega el campo en producto.service.ts (INSERT/UPDATE)
 *   4. Agrega el campo en el FIELDS array de Productos/config.tsx
 */

/** Fila completa de la tabla `productos` + nombre de categoría del JOIN. */
export interface Producto {
  id:               number;
  nombre:           string;
  categoria_id:     number | null;
  /** Viene del LEFT JOIN con categorias — no se guarda en productos. */
  categoria_nombre: string | null;
  imagen_url:       string | null;
  created_at:       Date;
  updated_at:       Date;
}

/** Payload para crear un producto (imagen se recibe via multer, no en este DTO). */
export interface CreateProductoDTO {
  nombre:       string;
  categoria_id?: number | null;
}

/** Payload para actualizar — todos los campos son opcionales (PATCH). */
export type UpdateProductoDTO = Partial<CreateProductoDTO>;
