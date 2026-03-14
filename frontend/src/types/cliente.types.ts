/**
 * cliente.types.ts — Interfaces TypeScript para Cliente en el frontend.
 * Espejo del modelo del backend. Fuente única de verdad para tipado en componentes y servicios.
 *
 * Para agregar un campo nuevo: editar Cliente y CreateClienteDTO,
 * luego actualizar ClienteForm.tsx con el nuevo campo.
 *
 * Tipos de documento (CAT-022 MH El Salvador):
 *   DUI             → código "13" — documento principal para persona_natural
 *   NIT             → código "36" — identificador de empresa (y persona_natural con NIT)
 *   Pasaporte       → código "03"
 *   Carnet Residente → código "04" (DIMEX — residentes extranjeros)
 *   Otro            → código "37"
 */

export type TipoCliente   = 'persona_natural' | 'empresa';
export type TipoDocumento = 'DUI' | 'NIT' | 'Pasaporte' | 'Carnet Residente' | 'Otro';

export interface Cliente {
  id:                   number;
  tipo_cliente:         TipoCliente;
  nombre_completo:      string;
  tipo_documento:       TipoDocumento;
  numero_documento:     string;
  // nit: campo separado para persona_natural con DUI + NIT distintos
  nit:                  string | null;
  // ncr: Número de Registro de Contribuyente — requerido en DTE_03 (Crédito Fiscal)
  ncr:                  string | null;
  nombre_comercial:     string | null;  // nombre comercial para empresas
  giro:                 string | null;  // actividad económica
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

export interface CreateClienteDTO {
  tipo_cliente:      TipoCliente;
  nombre_completo:   string;
  tipo_documento:    TipoDocumento;
  numero_documento:  string;
  nit?:              string;
  ncr?:              string;
  nombre_comercial?: string;
  giro?:             string;
  direccion?:        string;
  telefono?:         string;
  correo?:           string;
  departamento_id?:  number | null;
  municipio_id?:     number | null;
}

export type UpdateClienteDTO = Partial<CreateClienteDTO>;

export interface PaginatedClientes {
  data:       Cliente[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
