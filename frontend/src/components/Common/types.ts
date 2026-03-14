/**
 * types.ts — Tipos compartidos para el sistema genérico de CRUD.
 *
 * Estos tipos son el contrato entre:
 *   - El hook genérico (useGenericCRUD)
 *   - Los componentes genéricos (ListPage, DataTable, GenericForm)
 *   - Las configuraciones de cada módulo (Clientes, Proveedores, etc.)
 */

import type { ReactNode } from 'react';

// ── Servicio CRUD ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

/** Contrato que debe cumplir cualquier servicio para ser usado con el sistema genérico. */
export interface CRUDService<T, CreateDTO> {
  getAll: (params: { search?: string; page?: number; limit?: number }) => Promise<PaginatedResponse<T>>;
  create: (dto: CreateDTO) => Promise<T>;
  update: (id: number, dto: Partial<CreateDTO>) => Promise<T>;
  delete: (id: number) => Promise<void>;
}

// ── Configuración del modal de detalle ────────────────────────────────────────

/** Define un campo de solo lectura en el modal de detalle. */
export interface DetailField<T> {
  /** Etiqueta visible. */
  label:      string;
  /** Función que extrae el valor del item (puede devolver un ReactNode para badges). */
  getValue:   (item: T) => ReactNode;
  /** Si true, ocupa todo el ancho en el grid de 2 columnas. */
  fullWidth?: boolean;
}

// ── Configuración de columnas de tabla ───────────────────────────────────────

/** Define una columna de la tabla. */
export interface ColumnConfig<T> {
  /** Clave única de la columna (para key prop). */
  key:        string;
  /** Texto del encabezado. */
  label:      string;
  /** Si es ordenable. */
  sortable?:  boolean;
  /** Si true, el texto se muestra en color muted (#9b9b9b). */
  muted?:     boolean;
  /**
   * Función de renderizado personalizado.
   * Si no se define, se muestra `(item as any)[key] || '—'`.
   */
  render?:    (item: T) => ReactNode;
}

// ── Configuración de campos del formulario ────────────────────────────────────

export interface FieldOption {
  value: string;
  label: string;
}

/** Define un campo del formulario. */
export interface FieldConfig {
  /** Debe coincidir con una propiedad del DTO. */
  name:         string;
  label:        string;
  type:         'text' | 'email' | 'tel' | 'select' | 'textarea' | 'number' | 'file';
  required?:    boolean;
  maxLength?:   number;
  placeholder?: string;
  /** Solo para type='select': opciones estáticas. */
  options?:                FieldOption[];
  /**
   * Solo para type='select': carga opciones de forma asíncrona al montar el form.
   * Se usa para selects cuyas opciones vienen de una API (ej: departamentos).
   */
  loadOptions?:            () => Promise<FieldOption[]>;
  /**
   * Nombre del campo del que depende este select.
   * Cuando ese campo cambie de valor se llama a loadOptionsByDep con el nuevo valor.
   */
  dependsOn?:              string;
  /**
   * Carga opciones cuando el campo 'dependsOn' cambia (ej: municipios según departamento).
   * Si el valor dependiente está vacío, las opciones se limpian.
   */
  loadOptionsByDep?:       (depValue: string) => Promise<FieldOption[]>;
  /** Solo para type='file'. Ej: "image/jpeg,image/png,image/svg+xml" */
  accept?:      string;
}

// ── Configuración de entidad (textos de la página) ───────────────────────────

/** Textos de interfaz para cada módulo. Cambia aquí para localizar. */
export interface EntityConfig {
  /** Título de la página. Ej: "Clientes" */
  pageTitle:         string;
  /** Texto del botón de agregar. Ej: "Nuevo Cliente" */
  addButtonLabel:    string;
  /** Placeholder del buscador. Ej: "Buscar por nombre..." */
  searchPlaceholder: string;
  /** Título del modal al crear. Ej: "Nuevo Cliente" */
  createModalTitle:  string;
  /** Título del modal al editar. Ej: "Editar Cliente" */
  editModalTitle:    string;
  /** Texto del botón submit al crear. */
  createSubmitLabel: string;
  /** Texto del botón submit al editar. */
  editSubmitLabel:   string;
  /** Título del modal de confirmación de borrado. */
  deleteTitle:       string;
  /** Mensaje cuando no hay resultados. */
  emptyMessage:      string;
  /** Mensaje cuando la búsqueda no da resultados. */
  emptySearchMessage: string;
}

// ── Retorno del hook genérico ─────────────────────────────────────────────────

export interface UseGenericCRUDReturn<T, CreateDTO> {
  items:      T[];
  total:      number;
  totalPages: number;
  page:       number;
  limit:      number;
  search:     string;
  loading:    boolean;
  error:      string | null;
  setPage:    (page: number) => void;
  setLimit:   (limit: number) => void;
  setSearch:  (search: string) => void;
  create:     (dto: CreateDTO) => Promise<void>;
  update:     (id: number, dto: Partial<CreateDTO>) => Promise<void>;
  remove:     (id: number) => Promise<void>;
  refetch:    () => void;
}
