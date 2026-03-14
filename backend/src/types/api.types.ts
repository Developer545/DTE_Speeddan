/**
 * api.types.ts — Tipos compartidos para respuestas de la API.
 * Usados tanto en backend (servicios/controllers) como referencia para el frontend.
 */

/** Respuesta paginada genérica para cualquier lista de recursos. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Parámetros de query para endpoints de listado. */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  fecha_emision?: string;
  punto_venta_id?: number;
}

/** Forma estándar de un error de la API. */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
