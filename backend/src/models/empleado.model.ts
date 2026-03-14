/**
 * empleado.model.ts — Interfaces TypeScript para la entidad Empleado.
 *
 * Para agregar un campo nuevo:
 *   1. Agrega la columna en database.ts (CREATE TABLE)
 *   2. Agrega el campo aquí en Empleado y CreateEmpleadoDTO
 *   3. Agrega el campo en empleado.service.ts (INSERT/UPDATE)
 *   4. Agrega el campo en el FIELDS array de Empleados/config.tsx
 */

export type TipoDocumentoEmpleado = 'DUI' | 'Pasaporte' | 'Otro';

/** Fila completa de la tabla `empleados` tal como la retorna PostgreSQL. */
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
  created_at:           Date;
  updated_at:           Date;
}

/** Payload para crear un empleado nuevo (id y timestamps excluidos). */
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

/** Payload para actualizar — todos los campos son opcionales (PATCH). */
export type UpdateEmpleadoDTO = Partial<CreateEmpleadoDTO>;
