/**
 * categoria.types.ts — Interfaces TypeScript para Categoria en el frontend.
 * Espejo del modelo del backend. Fuente única de verdad para tipado en componentes y servicios.
 *
 * Para agregar un campo nuevo: editar Categoria y CreateCategoriaDTO,
 * luego agregar el campo al FIELDS array en Categorias/config.tsx.
 */

export interface Categoria {
  id:         number;
  nombre:     string;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoriaDTO {
  nombre: string;
}

export type UpdateCategoriaDTO = Partial<CreateCategoriaDTO>;

export interface PaginatedCategorias {
  data:       Categoria[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
