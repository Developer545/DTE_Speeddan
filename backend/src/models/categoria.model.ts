/**
 * categoria.model.ts — Interfaces TypeScript para la entidad Categoria.
 *
 * Para agregar un campo nuevo:
 *   1. Agrega la columna en database.ts (CREATE TABLE)
 *   2. Agrega el campo aquí en Categoria y CreateCategoriaDTO
 *   3. Agrega el campo en categoria.service.ts (INSERT/UPDATE)
 *   4. Agrega el campo en el FIELDS array de Categorias/config.tsx
 */

/** Fila completa de la tabla `categorias` tal como la retorna PostgreSQL. */
export interface Categoria {
  id:         number;
  nombre:     string;
  created_at: Date;
  updated_at: Date;
}

/** Payload para crear una categoría nueva (id y timestamps excluidos). */
export interface CreateCategoriaDTO {
  nombre: string;
}

/** Payload para actualizar — todos los campos son opcionales (PATCH). */
export type UpdateCategoriaDTO = Partial<CreateCategoriaDTO>;
