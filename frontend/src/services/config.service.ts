/**
 * config.service.ts — Llamadas API para el módulo de Configuración.
 */

import api from './api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

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
  updated_at:           string;
}

export interface ConfigTema {
  id:          number;
  accent:      string;
  accent_text: string;
  page_bg:     string;
  card_bg:     string;
  sidebar_bg:  string;
  glass_blur:  string;
  updated_at:  string;
}

export interface DTEConfig {
  id:            number;
  tipo_dte:      'DTE_01' | 'DTE_03' | 'DTE_05' | 'DTE_06' | 'DTE_11';
  prefijo:       string;
  numero_actual: number;
  updated_at:    string;
}

export interface Usuario {
  id:         number;
  nombre:     string;
  username:   string;
  rol:        'admin' | 'user';
  activo:     boolean;
  created_at: string;
  updated_at: string;
}

// ── Empresa ───────────────────────────────────────────────────────────────────

export const getEmpresa    = (): Promise<ConfigEmpresa> =>
  api.get('/config/empresa').then(r => r.data);

export const updateEmpresa = (data: Partial<ConfigEmpresa>): Promise<ConfigEmpresa> =>
  api.put('/config/empresa', data).then(r => r.data);

export const uploadEmpresaLogo = (file: File): Promise<ConfigEmpresa> => {
  const form = new FormData();
  form.append('logo', file);
  return api.post('/config/empresa/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

// ── Tema ──────────────────────────────────────────────────────────────────────

export const getTema         = (): Promise<ConfigTema>     =>
  api.get('/config/tema').then(r => r.data);

export const updateTema      = (data: Partial<ConfigTema>): Promise<ConfigTema> =>
  api.put('/config/tema', data).then(r => r.data);

// ── DTE ───────────────────────────────────────────────────────────────────────

export const getDTEConfigs   = (): Promise<DTEConfig[]>    =>
  api.get('/config/dte').then(r => r.data);

export const updateDTE       = (tipo: string, data: { prefijo?: string; numero_actual?: number }): Promise<DTEConfig> =>
  api.put(`/config/dte/${tipo}`, data).then(r => r.data);

// ── Sucursales ────────────────────────────────────────────────────────────────

export interface Sucursal {
  id:                  number;
  nombre:              string;
  codigo:              string;
  codigo_mh:           string | null;
  direccion:           string | null;
  departamento_id:     number | null;
  municipio_id:        number | null;
  telefono:            string | null;
  correo:              string | null;
  activo:              boolean;
  departamento_nombre?: string | null;
  municipio_nombre?:   string | null;
  updated_at:          string;
}

export interface PuntoVenta {
  id:             number;
  sucursal_id:    number;
  nombre:         string;
  codigo:         string;
  codigo_mh:      string | null;
  activo:         boolean;
  sucursal_nombre?: string;
  prefijo?:       string;
  updated_at:     string;
}

export interface ConfigAPIMH {
  id:              number;
  ambiente:        string;
  url_auth:        string;
  url_transmision: string;
  usuario_api:     string | null;
  tiene_password:  boolean;
  tiene_token:     boolean;
  token_expira_en: string | null;
  updated_at:      string;
}

export interface ConfigFirma {
  id:                number;
  certificado_path:  string | null;
  tiene_certificado: boolean;
  tiene_password:    boolean;
  nit_certificado:   string | null;
  fecha_vencimiento: string | null;
  updated_at:        string;
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

export const getUsuarios     = (): Promise<Usuario[]>      =>
  api.get('/config/usuarios').then(r => r.data);

export const createUsuario   = (data: { nombre: string; username: string; password: string; rol: 'admin' | 'user' }): Promise<Usuario> =>
  api.post('/config/usuarios', data).then(r => r.data);

export const updateUsuario   = (id: number, data: Partial<{ nombre: string; username: string; password: string; rol: 'admin' | 'user'; activo: boolean }>): Promise<Usuario> =>
  api.put(`/config/usuarios/${id}`, data).then(r => r.data);

export const deleteUsuario   = (id: number): Promise<void> =>
  api.delete(`/config/usuarios/${id}`).then(() => undefined);

export const getLimiteUsuarios = (): Promise<{ max: number | null }> =>
  api.get('/config/usuarios/limite').then(r => r.data);

// ── Sucursales ────────────────────────────────────────────────────────────────

export const getSucursales    = (): Promise<Sucursal[]> =>
  api.get('/config/sucursales').then(r => r.data);

export const createSucursal   = (data: Partial<Sucursal>): Promise<Sucursal> =>
  api.post('/config/sucursales', data).then(r => r.data);

export const updateSucursal   = (id: number, data: Partial<Sucursal>): Promise<Sucursal> =>
  api.put(`/config/sucursales/${id}`, data).then(r => r.data);

export const deleteSucursal   = (id: number): Promise<void> =>
  api.delete(`/config/sucursales/${id}`).then(() => undefined);

// ── Puntos de Venta ───────────────────────────────────────────────────────────

export const getPuntosVenta   = (sucursalId?: number): Promise<PuntoVenta[]> =>
  api.get('/config/puntos-venta', { params: sucursalId ? { sucursalId } : {} }).then(r => r.data);

export const createPuntoVenta = (data: Partial<PuntoVenta>): Promise<PuntoVenta> =>
  api.post('/config/puntos-venta', data).then(r => r.data);

export const updatePuntoVenta = (id: number, data: Partial<PuntoVenta>): Promise<PuntoVenta> =>
  api.put(`/config/puntos-venta/${id}`, data).then(r => r.data);

export const deletePuntoVenta = (id: number): Promise<void> =>
  api.delete(`/config/puntos-venta/${id}`).then(() => undefined);

// ── API Hacienda ──────────────────────────────────────────────────────────────

export const getAPIMH         = (): Promise<ConfigAPIMH> =>
  api.get('/config/api-mh').then(r => r.data);

export const updateAPIMH      = (data: Partial<ConfigAPIMH> & { password_api?: string }): Promise<ConfigAPIMH> =>
  api.put('/config/api-mh', data).then(r => r.data);

// ── Firma Electrónica ─────────────────────────────────────────────────────────

export const getFirma         = (): Promise<ConfigFirma> =>
  api.get('/config/firma').then(r => r.data);

export const updateFirma      = (data: { certificado_pass?: string; nit_certificado?: string; fecha_vencimiento?: string }): Promise<ConfigFirma> =>
  api.put('/config/firma', data).then(r => r.data);

export const uploadCertificado = (file: File): Promise<ConfigFirma> => {
  const form = new FormData();
  form.append('certificado', file);
  return api.post('/config/firma/certificado', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
