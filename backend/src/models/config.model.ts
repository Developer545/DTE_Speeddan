/**
 * config.model.ts — Interfaces para el módulo de Configuración.
 */

export interface ConfigEmpresa {
  id:                   number;
  nombre_negocio:       string;
  nit:                  string | null;
  ncr:                  string | null;
  direccion:            string | null;
  giro:                 string | null;
  departamento:         string | null;
  municipio:            string | null;
  telefono:             string | null;
  correo:               string | null;
  logo_url:             string | null;
  // Campos DTE
  cod_actividad:        string | null;
  desc_actividad:       string | null;
  tipo_establecimiento: string | null;
  departamento_id:      number | null;
  municipio_id:         number | null;
  updated_at:           Date;
}

export interface UpdateEmpresaDTO {
  nombre_negocio:        string;
  nit?:                  string;
  ncr?:                  string;
  direccion?:            string;
  giro?:                 string;
  departamento?:         string;
  municipio?:            string;
  departamento_id?:      number | null;
  municipio_id?:         number | null;
  telefono?:             string;
  correo?:               string;
  cod_actividad?:        string;
  desc_actividad?:       string;
  tipo_establecimiento?: string;
}

export interface ConfigTema {
  id:          number;
  accent:      string;
  accent_text: string;
  page_bg:     string;
  card_bg:     string;
  sidebar_bg:  string;
  glass_blur:  string;
  updated_at:  Date;
}

export interface UpdateTemaDTO {
  accent?:      string;
  accent_text?: string;
  page_bg?:     string;
  card_bg?:     string;
  sidebar_bg?:  string;
  glass_blur?:  string;
}

export interface DTEConfig {
  id:           number;
  tipo_dte:     'DTE_01' | 'DTE_03' | 'DTE_05' | 'DTE_06' | 'DTE_11';
  prefijo:      string;
  numero_actual: number;
  updated_at:   Date;
}

export interface UpdateDTEDTO {
  prefijo?:      string;
  numero_actual?: number;
}

export interface Usuario {
  id:         number;
  nombre:     string;
  username:   string;
  rol:        'admin' | 'user';
  activo:     boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUsuarioDTO {
  nombre:   string;
  username: string;
  password: string;
  rol:      'admin' | 'user';
}

export interface UpdateUsuarioDTO {
  nombre?:   string;
  username?: string;
  password?: string;
  rol?:      'admin' | 'user';
  activo?:   boolean;
}

// ── Sucursales ──────────────────────────────────────────────────────────────

export interface Sucursal {
  id:              number;
  nombre:          string;
  codigo:          string;
  codigo_mh:       string | null;
  direccion:       string | null;
  departamento_id: number | null;
  municipio_id:    number | null;
  telefono:        string | null;
  correo:          string | null;
  activo:          boolean;
  created_at:      Date;
  updated_at:      Date;
  // JOIN fields
  departamento_nombre?: string | null;
  municipio_nombre?:    string | null;
  puntos_venta?:        PuntoVenta[];
}

export interface CreateSucursalDTO {
  nombre:          string;
  codigo:          string;
  codigo_mh?:      string;
  direccion?:      string;
  departamento_id?: number | null;
  municipio_id?:   number | null;
  telefono?:       string;
  correo?:         string;
  activo?:         boolean;
}

// ── Puntos de Venta ─────────────────────────────────────────────────────────

export interface PuntoVenta {
  id:          number;
  sucursal_id: number;
  nombre:      string;
  codigo:      string;
  codigo_mh:   string | null;
  activo:      boolean;
  created_at:  Date;
  updated_at:  Date;
  // JOIN fields
  sucursal_nombre?: string;
  prefijo?:         string;   // derived: sucursal.codigo + punto.codigo
}

export interface CreatePuntoVentaDTO {
  sucursal_id: number;
  nombre:      string;
  codigo:      string;
  codigo_mh?:  string;
  activo?:     boolean;
}

// ── Configuración API Hacienda ──────────────────────────────────────────────

export interface ConfigAPIMH {
  id:               number;
  ambiente:         string;
  url_auth:         string;
  url_transmision:  string;
  usuario_api:      string | null;
  password_api:     string | null;  // never returned to frontend
  token_activo:     string | null;
  token_expira_en:  Date | null;
  updated_at:       Date;
}

export interface UpdateAPIMHDTO {
  ambiente?:        string;
  url_auth?:        string;
  url_transmision?: string;
  usuario_api?:     string;
  password_api?:    string;
}

// ── Configuración Firma Electrónica ─────────────────────────────────────────

export interface ConfigFirma {
  id:                number;
  certificado_path:  string | null;
  certificado_pass:  string | null;  // never returned in full to frontend
  nit_certificado:   string | null;
  fecha_vencimiento: Date | null;
  updated_at:        Date;
}

export interface UpdateFirmaDTO {
  certificado_pass?:  string;
  nit_certificado?:   string;
  fecha_vencimiento?: string;
}
