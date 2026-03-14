/**
 * superadmin.service.ts — Cliente HTTP para el panel SuperAdmin.
 * Todas las requests van a /superadmin/* (no /api/*).
 * Usa la misma instancia de axios con withCredentials para enviar la cookie erp_superadmin_token.
 */

import axios from 'axios';

const api = axios.create({
  baseURL:         'http://localhost:3001/superadmin',
  withCredentials: true,
});

// Normalizar errores de axios a mensajes legibles
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const message = err.response?.data?.message ?? err.message ?? 'Error desconocido';
    return Promise.reject(new Error(message));
  }
);

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SuperAdminUser {
  id:       number;
  username: string;
  nombre:   string;
}

export type TenantEstado = 'pruebas' | 'activo' | 'suspendido';

export interface TenantListItem {
  id:               number;
  nombre:           string;
  slug:             string;
  email_contacto:   string | null;
  telefono:         string | null;
  estado:           TenantEstado;
  fecha_pago:       string | null;
  fecha_suspension: string | null;
  plan_nombre:      string | null;
  created_at:       string;
  dias_para_vencer: number | null;
}

export interface TenantDetalle extends TenantListItem {
  notas:                    string | null;
  plan_id:                  number | null;
  /** Límite efectivo: COALESCE(tenant.max_sucursales, plan.max_sucursales) */
  max_sucursales:            number | null;
  /** Override específico del tenant (null = usar el del plan) */
  max_sucursales_override:   number | null;
  /** Límite que viene del plan contratado */
  plan_max_sucursales:       number | null;
  /** Límite efectivo de puntos de venta (total del tenant) */
  max_puntos_venta:          number | null;
  max_puntos_venta_override: number | null;
  plan_max_puntos_venta:     number | null;
  /** Límite efectivo de usuarios */
  max_usuarios:              number | null;
  max_usuarios_override:     number | null;
  plan_max_usuarios:         number | null;
  api_ambiente:             string | null;
  api_usuario:              string | null;
  api_token_expira:         string | null;
  firma_archivo:            string | null;
  firma_nit:                string | null;
  firma_vence:              string | null;
  updated_at:               string;
}

export interface Plan {
  id:             number;
  nombre:         string;
  max_sucursales: number;
  max_usuarios:   number;
  precio:         number;
  activo:         boolean;
}

export interface Departamento {
  id:     number;
  codigo: string;
  nombre: string;
}

export interface Municipio {
  id:              number;
  codigo:          string;
  nombre:          string;
  departamento_id: number;
  departamento_nombre?: string;
}

export interface DashboardAlerta {
  id:           number;
  nombre:       string;
  slug:         string;
  fecha_pago:   string;
  dias_restantes?: number;
  dias_vencido?:   number;
  plan_nombre:  string | null;
}

export interface DashboardStats {
  total:                  number;
  activos:                number;
  en_pruebas:             number;
  suspendidos:            number;
  por_vencer:             number;
  vencidos:               number;
  nuevos_semana:          number;
  nuevos_mes:             number;
  mrr:                    number;
  ingresos_mes:           number;
  ingresos_mes_anterior:  number;
  alertas_por_vencer:     DashboardAlerta[];
  alertas_vencidos:       DashboardAlerta[];
}

export interface CreateTenantDTO {
  nombre:          string;
  slug:            string;
  email_contacto?: string;
  telefono?:       string;
  plan_id?:        number;
  fecha_pago?:     string;
  notas?:          string;
  admin_username?: string;
  admin_password?: string;
  admin_nombre?:   string;
}

export interface UpdateTenantDTO {
  nombre?:           string;
  slug?:             string;
  email_contacto?:   string;
  telefono?:         string;
  plan_id?:          number;
  estado?:           TenantEstado;
  fecha_pago?:       string;
  fecha_suspension?: string;
  notas?:            string;
  /** Override de límite de sucursales. null = quitar override y usar el del plan. */
  max_sucursales?:   number | null;
  /** Override de límite de puntos de venta. null = quitar override y usar el del plan. */
  max_puntos_venta?: number | null;
  /** Override de límite de usuarios. null = quitar override y usar el del plan. */
  max_usuarios?:     number | null;
}

export interface PagoDTO {
  monto:                   number;
  fecha_pago?:             string;
  metodo?:                 string;
  notas?:                  string;
  nueva_fecha_vencimiento?: string;
}

export interface ApiMhDTO {
  usuario_api:  string;
  password_api: string;
}

export interface FirmaDTO {
  certificado_pass?:  string;
  nit_certificado?:   string;
  fecha_vencimiento?: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const superAdminSvc = {
  /** Paso 1 del login. Si el servidor responde { requires2FA, tempToken }, se requiere paso 2. */
  login: (username: string, password: string) =>
    api.post<SuperAdminUser | { requires2FA: true; tempToken: string }>(
      '/auth/login', { username, password }
    ).then(r => r.data),

  logout: () =>
    api.post('/auth/logout').then(r => r.data),

  getMe: () =>
    api.get<SuperAdminUser>('/auth/me').then(r => r.data),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard: () =>
    api.get<DashboardStats>('/dashboard').then(r => r.data),

  // ── Planes ─────────────────────────────────────────────────────────────────
  getPlanes: () =>
    api.get<Plan[]>('/planes').then(r => r.data),

  createPlan: (dto: Partial<Plan>) =>
    api.post<Plan>('/planes', dto).then(r => r.data),

  updatePlan: (id: number, dto: Partial<Plan>) =>
    api.put<Plan>(`/planes/${id}`, dto).then(r => r.data),

  deletePlan: (id: number) =>
    api.delete(`/planes/${id}`).then(r => r.data),

  // ── Departamentos ──────────────────────────────────────────────────────────
  getDepartamentos: () =>
    api.get<Departamento[]>('/departamentos').then(r => r.data),

  createDepartamento: (dto: { codigo: string; nombre: string }) =>
    api.post<Departamento>('/departamentos', dto).then(r => r.data),

  updateDepartamento: (id: number, dto: { codigo: string; nombre: string }) =>
    api.put<Departamento>(`/departamentos/${id}`, dto).then(r => r.data),

  deleteDepartamento: (id: number) =>
    api.delete(`/departamentos/${id}`).then(r => r.data),

  // ── Municipios ─────────────────────────────────────────────────────────────
  getMunicipios: (departamentoId?: number) =>
    api.get<Municipio[]>('/municipios', { params: departamentoId ? { departamentoId } : undefined }).then(r => r.data),

  createMunicipio: (dto: { codigo: string; nombre: string; departamento_id: number }) =>
    api.post<Municipio>('/municipios', dto).then(r => r.data),

  updateMunicipio: (id: number, dto: { codigo: string; nombre: string; departamento_id: number }) =>
    api.put<Municipio>(`/municipios/${id}`, dto).then(r => r.data),

  deleteMunicipio: (id: number) =>
    api.delete(`/municipios/${id}`).then(r => r.data),

  // ── Tenants ────────────────────────────────────────────────────────────────
  getTenants: () =>
    api.get<TenantListItem[]>('/tenants').then(r => r.data),

  getTenant: (id: number) =>
    api.get<TenantDetalle>(`/tenants/${id}`).then(r => r.data),

  createTenant: (dto: CreateTenantDTO) =>
    api.post<{ tenant: TenantDetalle; admin_username: string; admin_password: string }>('/tenants', dto).then(r => r.data),

  updateTenant: (id: number, dto: UpdateTenantDTO) =>
    api.put<TenantDetalle>(`/tenants/${id}`, dto).then(r => r.data),

  // ── Pagos ──────────────────────────────────────────────────────────────────
  getPagos: (tenantId: number) =>
    api.get<any[]>(`/tenants/${tenantId}/pagos`).then(r => r.data),

  registrarPago: (tenantId: number, dto: PagoDTO) =>
    api.post(`/tenants/${tenantId}/pagos`, dto).then(r => r.data),

  // ── API MH ─────────────────────────────────────────────────────────────────
  getApiMh: (tenantId: number) =>
    api.get(`/tenants/${tenantId}/api-mh`).then(r => r.data),

  updateApiMh: (tenantId: number, dto: ApiMhDTO) =>
    api.put(`/tenants/${tenantId}/api-mh`, dto).then(r => r.data),

  // ── Firma ──────────────────────────────────────────────────────────────────
  getFirma: (tenantId: number) =>
    api.get(`/tenants/${tenantId}/firma`).then(r => r.data),

  updateFirma: (tenantId: number, dto: FirmaDTO) =>
    api.put(`/tenants/${tenantId}/firma`, dto).then(r => r.data),

  uploadCertificado: (tenantId: number, file: File) => {
    const form = new FormData();
    form.append('certificado', file);
    return api.post(`/tenants/${tenantId}/firma/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  // ── Usuarios del tenant ────────────────────────────────────────────────────
  getUsuarios: (tenantId: number) =>
    api.get<any[]>(`/tenants/${tenantId}/usuarios`).then(r => r.data),

  createUsuario: (tenantId: number, dto: any) =>
    api.post(`/tenants/${tenantId}/usuarios`, dto).then(r => r.data),

  updateUsuario: (tenantId: number, userId: number, dto: any) =>
    api.put(`/tenants/${tenantId}/usuarios/${userId}`, dto).then(r => r.data),

  deleteUsuario: (tenantId: number, userId: number) =>
    api.delete(`/tenants/${tenantId}/usuarios/${userId}`).then(r => r.data),

  resetPassword: (tenantId: number, userId: number) =>
    api.post<{ username: string; nueva_password: string; mensaje: string }>(
      `/tenants/${tenantId}/usuarios/${userId}/reset-password`
    ).then(r => r.data),

  // ── DTE del tenant ─────────────────────────────────────────────────────────
  getDTE: (tenantId: number) =>
    api.get<any[]>(`/tenants/${tenantId}/dte`).then(r => r.data),

  updateDTE: (tenantId: number, tipo: string, dto: { prefijo?: string; numero_actual?: number }) =>
    api.put(`/tenants/${tenantId}/dte/${tipo}`, dto).then(r => r.data),

  // ── Sucursales del tenant ──────────────────────────────────────────────────
  getSucursales: (tenantId: number) =>
    api.get<any[]>(`/tenants/${tenantId}/sucursales`).then(r => r.data),

  createSucursal: (tenantId: number, dto: any) =>
    api.post(`/tenants/${tenantId}/sucursales`, dto).then(r => r.data),

  updateSucursal: (tenantId: number, sucId: number, dto: any) =>
    api.put(`/tenants/${tenantId}/sucursales/${sucId}`, dto).then(r => r.data),

  deleteSucursal: (tenantId: number, sucId: number) =>
    api.delete(`/tenants/${tenantId}/sucursales/${sucId}`).then(r => r.data),

  // ── Puntos de Venta del tenant (via superadmin) ────────────────────────────
  getPuntosVenta: (tenantId: number, sucId: number) =>
    api.get<any[]>(`/tenants/${tenantId}/sucursales/${sucId}/puntos-venta`).then(r => r.data),

  createPuntoVenta: (tenantId: number, sucId: number, dto: any) =>
    api.post(`/tenants/${tenantId}/sucursales/${sucId}/puntos-venta`, dto).then(r => r.data),

  updatePuntoVenta: (tenantId: number, sucId: number, pvId: number, dto: any) =>
    api.put(`/tenants/${tenantId}/sucursales/${sucId}/puntos-venta/${pvId}`, dto).then(r => r.data),

  deletePuntoVenta: (tenantId: number, sucId: number, pvId: number) =>
    api.delete(`/tenants/${tenantId}/sucursales/${sucId}/puntos-venta/${pvId}`).then(r => r.data),

  // ── Impersonación ─────────────────────────────────────────────────────────
  impersonateTenant: (tenantId: number) =>
    api.post<{ token: string; expires_in: number }>(`/tenants/${tenantId}/impersonate`).then(r => r.data),

  // ── Empresa del tenant (configuracion_empresa) ─────────────────────────────
  getEmpresaConfig: (tenantId: number) =>
    api.get(`/tenants/${tenantId}/config/empresa`).then(r => r.data),

  updateEmpresaConfig: (tenantId: number, dto: any) =>
    api.put(`/tenants/${tenantId}/config/empresa`, dto).then(r => r.data),

  uploadEmpresaLogo: (tenantId: number, file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post(`/tenants/${tenantId}/config/empresa/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  // ── Tema del tenant (configuracion_tema) ───────────────────────────────────
  getTemaConfig: (tenantId: number) =>
    api.get(`/tenants/${tenantId}/config/tema`).then(r => r.data),

  updateTemaConfig: (tenantId: number, dto: any) =>
    api.put(`/tenants/${tenantId}/config/tema`, dto).then(r => r.data),

  // ── 2FA ────────────────────────────────────────────────────────────────────

  /** Genera un nuevo secreto TOTP y devuelve la URL del QR y el secreto Base32. */
  setup2FA: () =>
    api.post<{ qrUrl: string; secret: string }>('/auth/2fa/setup').then(r => r.data),

  /** Verifica el código TOTP e inicia (activa) el 2FA. */
  verify2FASetup: (code: string) =>
    api.post<{ ok: boolean; message: string }>('/auth/2fa/verify-setup', { code }).then(r => r.data),

  /** Desactiva el 2FA tras verificar el código TOTP actual. */
  disable2FA: (code: string) =>
    api.post<{ ok: boolean; message: string }>('/auth/2fa/disable', { code }).then(r => r.data),

  /**
   * Paso 2 del login: valida el código TOTP con el tempToken del paso 1.
   * En caso de éxito el servidor establece la cookie de sesión.
   */
  login2FA: (tempToken: string, code: string) =>
    api.post<SuperAdminUser>('/auth/2fa/login', { tempToken, code }).then(r => r.data),
};

// ── Health check avanzado ──────────────────────────────────────────────────────

export interface HealthDatabase {
  status:      'ok' | 'error';
  latency_ms:  number;
  version:     string;
  server_time: string | null;
  pool: {
    total:   number;
    idle:    number;
    waiting: number;
    max:     number;
  };
}

export interface HealthMemory {
  rss_mb:        number;
  heap_used_mb:  number;
  heap_total_mb: number;
  external_mb:   number;
}

export interface HealthProcess {
  uptime_seconds: number;
  node_version:   string;
  platform:       string;
  arch:           string;
  environment:    string;
  pid:            number;
  memory:         HealthMemory;
}

export interface HealthTenants {
  total:        number;
  activos:      number;
  suspendidos:  number;
  en_pruebas:   number;
}

export interface HealthData {
  status:    'ok' | 'degraded' | 'error';
  timestamp: string;
  database:  HealthDatabase;
  process:   HealthProcess;
  tenants:   HealthTenants;
}

export const healthService = {
  get: () => api.get<HealthData>('/health').then(r => r.data),
};

// ── Auditoría ─────────────────────────────────────────────────────────────────

export interface AuditItem {
  id:              number;
  actor_id:        number | null;
  actor_tipo:      'superadmin' | 'sistema';
  accion:          string;
  tenant_id:       number | null;
  detalle:         Record<string, unknown> | null;
  ip:              string | null;
  created_at:      string;
  actor_nombre:    string | null;
  actor_username:  string | null;
  tenant_nombre:   string | null;
  tenant_slug:     string | null;
}

export interface AuditResponse {
  total: number;
  page:  number;
  limit: number;
  pages: number;
  items: AuditItem[];
}

export interface AuditFilters {
  page?:         number;
  limit?:        number;
  actor_tipo?:   string;
  accion?:       string;
  tenant_id?:    number;
  fecha_inicio?: string;
  fecha_fin?:    string;
}

export const auditService = {
  get: (filters: AuditFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    return api.get<AuditResponse>(`/audit?${params.toString()}`).then(r => r.data);
  },
};

// ── Mapa de clientes ──────────────────────────────────────────────────────────

export interface MapaDepartamento {
  codigo:       string;
  nombre:       string;
  total:        number;
  activos:      number;
  suspendidos:  number;
  en_pruebas:   number;
}

export interface MapaData {
  departamentos:  MapaDepartamento[];
  sin_ubicacion:  number;
  total_tenants:  number;
}

export const mapaService = {
  get: () => api.get<MapaData>('/mapa').then(r => r.data),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsSeriePunto {
  mes:          string;
  mes_label:    string;
  ingresos:     number;
  nuevos:       number;
  activaciones: number;
  suspensiones: number;
}

export interface AnalyticsPorPlan {
  plan:    string;
  total:   number;
  activos: number;
  precio:  number;
}

export interface AnalyticsPorEstado {
  estado: string;
  total:  number;
}

export interface AnalyticsKpis {
  crecimiento_mom:  number;
  ingreso_ytd:      number;
  nuevos_mes:       number;
  suspensiones_mes: number;
  activaciones_mes: number;
}

export interface AnalyticsData {
  serie:     AnalyticsSeriePunto[];
  por_plan:  AnalyticsPorPlan[];
  por_estado: AnalyticsPorEstado[];
  kpis:      AnalyticsKpis;
}

export const analyticsService = {
  get: () => api.get<AnalyticsData>('/analytics').then(r => r.data),
};

// ── Backups ────────────────────────────────────────────────────────────────────

export interface BackupFile {
  filename:   string;
  type:       'database' | 'uploads';
  size_bytes: number;
  size_mb:    string;
  created_at: string;
}

export interface BackupStats {
  total_backups:  number;
  total_size_mb:  string;
  last_backup_at: string | null;
  retention_days: number;
  backup_dir:     string;
}

export interface BackupListResponse {
  stats:   BackupStats;
  backups: BackupFile[];
}

export const backupService = {
  list:   () => api.get<BackupListResponse>('/system/backups').then(r => r.data),
  runNow: () => api.post<{ message: string }>('/system/backups/run').then(r => r.data),
};
