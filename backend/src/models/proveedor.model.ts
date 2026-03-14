/**
 * proveedor.model.ts — Interfaces TypeScript para la entidad Proveedor.
 *
 * Para agregar un campo nuevo:
 *   1. Agrega la columna en database.ts (CREATE TABLE)
 *   2. Agrega el campo aquí en Proveedor y CreateProveedorDTO
 *   3. Agrega el campo en proveedor.service.ts (INSERT/UPDATE)
 *   4. Agrega el campo en el FIELDS array de ProveedorForm.tsx
 */

/** Fila completa de la tabla `proveedores` tal como la retorna PostgreSQL. */
export interface Proveedor {
  id:                   number;
  nombre:               string;
  nit:                  string | null;
  ncr:                  string | null;
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

/** Payload para crear un proveedor nuevo. */
export interface CreateProveedorDTO {
  nombre:           string;
  nit?:             string;
  ncr?:             string;
  direccion?:       string;
  telefono?:        string;
  correo?:          string;
  departamento_id?: number | null;
  municipio_id?:    number | null;
}

/** Payload para actualizar — todos los campos son opcionales (PATCH). */
export type UpdateProveedorDTO = Partial<CreateProveedorDTO>;
