/**
 * cliente.model.ts — Interfaces TypeScript para la entidad Cliente.
 *
 * Para agregar un campo nuevo:
 *   1. Agrega la columna en database.ts (ALTER TABLE con IF NOT EXISTS)
 *   2. Agrega el campo aquí en Cliente y CreateClienteDTO
 *   3. Agrega el campo en cliente.service.ts (INSERT/UPDATE)
 *   4. Agrega el campo en ClienteForm.tsx
 *
 * Tipos de documento (CAT-022 MH El Salvador):
 *   DUI            → código "13" — documento principal para persona_natural
 *   NIT            → código "36" — identifica empresa; también persona_natural con NIT
 *   Pasaporte      → código "03"
 *   Carnet Residente → código "04" (DIMEX)
 *   Otro           → código "37"
 */

export type TipoCliente   = 'persona_natural' | 'empresa';
export type TipoDocumento = 'DUI' | 'NIT' | 'Pasaporte' | 'Carnet Residente' | 'Otro';

/** Fila completa de la tabla `clientes` tal como la retorna PostgreSQL. */
export interface Cliente {
  id:                   number;
  tipo_cliente:         TipoCliente;
  nombre_completo:      string;
  tipo_documento:       TipoDocumento;
  numero_documento:     string;
  // nit: campo separado para persona_natural que tiene DUI + NIT distintos
  // Para empresa, tipo_documento='NIT' y numero_documento contiene el NIT
  nit:                  string | null;
  // ncr: Número de Registro de Contribuyente — requerido en DTE_03 (Crédito Fiscal)
  ncr:                  string | null;
  nombre_comercial:     string | null;  // nombre con el que opera (vs. razón social)
  giro:                 string | null;  // actividad económica
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

/** Payload para crear un cliente nuevo (id y timestamps excluidos). */
export interface CreateClienteDTO {
  tipo_cliente:     TipoCliente;
  nombre_completo:  string;
  tipo_documento:   TipoDocumento;
  numero_documento: string;
  nit?:             string;
  ncr?:             string;
  nombre_comercial?: string;
  giro?:            string;
  direccion?:       string;
  telefono?:        string;
  correo?:          string;
  departamento_id?: number | null;
  municipio_id?:    number | null;
}

/** Payload para actualizar — todos los campos son opcionales (PATCH). */
export type UpdateClienteDTO = Partial<CreateClienteDTO>;
