/**
 * empleado.types.ts — Interfaces TypeScript para Empleado en el frontend.
 * Espejo del modelo del backend. Fuente única de verdad para tipado en componentes y servicios.
 *
 * Para agregar un campo nuevo: editar Empleado y CreateEmpleadoDTO,
 * luego agregar el campo al FIELDS array en Empleados/config.tsx.
 */

export type TipoDocumentoEmpleado = 'DUI' | 'Pasaporte' | 'Otro';

export interface Empleado {
  id:                   number;
  nombre_completo:      string;
  tipo_documento:       TipoDocumentoEmpleado;
  numero_documento:     string;
  direccion:            string | null;
  telefono:             string | null;
  correo:               string | null;
  departamento_id:      number | null;
  municipio_id:         number | null;
  departamento_nombre?: string | null;
  municipio_nombre?:    string | null;
  created_at:           string;
  updated_at:           string;
}

export interface CreateEmpleadoDTO {
  nombre_completo:  string;
  tipo_documento:   TipoDocumentoEmpleado;
  numero_documento: string;
  direccion?:       string;
  telefono?:        string;
  correo?:          string;
  departamento_id?: number | null;
  municipio_id?:    number | null;
}

export type UpdateEmpleadoDTO = Partial<CreateEmpleadoDTO>;

export interface PaginatedEmpleados {
  data:       Empleado[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
