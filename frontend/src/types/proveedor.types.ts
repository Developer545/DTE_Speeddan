/**
 * proveedor.types.ts — Interfaces TypeScript para Proveedor en el frontend.
 */

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
  created_at:           string;
  updated_at:           string;
}

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

export type UpdateProveedorDTO = Partial<CreateProveedorDTO>;

export interface PaginatedProveedores {
  data:       Proveedor[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
