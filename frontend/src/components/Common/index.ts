/**
 * Common/index.ts — Exportaciones del sistema genérico de CRUD.
 * Importa desde aquí en los módulos específicos.
 */
export { default as ListPage }      from './ListPage';
export { default as DataTable }     from './DataTable';
export { default as GenericForm }   from './GenericForm';
export { default as ConfirmDialog } from './ConfirmDialog';
export { default as Pagination }    from './Pagination';
export { default as SearchBar }     from './SearchBar';
export { default as ErrorBanner }   from './ErrorBanner';
export type {
  ColumnConfig, FieldConfig, EntityConfig, DetailField,
  CRUDService, UseGenericCRUDReturn, PaginatedResponse,
} from './types';
export type { CustomFormProps } from './ListPage';
