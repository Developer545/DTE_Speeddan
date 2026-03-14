/**
 * superadmin.model.ts — Interfaces y tipos del módulo SuperAdmin.
 *
 * Centraliza todas las definiciones TypeScript usadas por services,
 * controllers y routes del panel SuperAdmin.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ── SUPERADMIN USER ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface SuperAdminUser {
  id:           number;
  nombre:       string;
  username:     string;
  activo:       boolean;
  totp_enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PLANES ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface Plan {
  id:             number;
  nombre:         string;
  max_sucursales: number;
  max_usuarios:   number;
  precio:         number;
  activo:         boolean;
}

export interface CreatePlanDTO {
  nombre:         string;
  max_sucursales: number;
  max_usuarios:   number;
  precio:         number;
  activo?:        boolean;
}

export interface UpdatePlanDTO {
  nombre?:         string;
  max_sucursales?: number;
  max_usuarios?:   number;
  precio?:         number;
  activo?:         boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── TENANTS ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface TenantListItem {
  id:               number;
  nombre:           string;
  slug:             string;
  email_contacto:   string | null;
  telefono:         string | null;
  estado:           'pruebas' | 'activo' | 'suspendido';
  fecha_pago:       string | null;
  fecha_suspension: string | null;
  plan_nombre:      string | null;
  created_at:       string;
  /** Días hasta el vencimiento del pago (negativo = ya venció) */
  dias_para_vencer: number | null;
}

export interface TenantDetalle extends TenantListItem {
  plan_id:                 number | null;
  notas:                   string | null;
  updated_at:              string;
  max_sucursales:          number | null;
  max_sucursales_override: number | null;
  plan_max_sucursales:     number | null;
  max_puntos_venta:        number | null;
  max_puntos_venta_override: number | null;
  plan_max_puntos_venta:   number | null;
  max_usuarios:            number | null;
  max_usuarios_override:   number | null;
  plan_max_usuarios:       number | null;
  api_ambiente:            string | null;
  api_usuario:             string | null;
  api_token_expira:        string | null;
  firma_archivo:           string | null;
  firma_nit:               string | null;
  firma_vence:             string | null;
}

export interface CreateTenantDTO {
  nombre:           string;
  slug:             string;
  email_contacto?:  string;
  telefono?:        string;
  plan_id?:         number;
  fecha_pago?:      string;
  notas?:           string;
  /** Username del admin de la empresa (por defecto 'admin') */
  admin_username?:  string;
  /** Password del admin de la empresa (por defecto 'admin123') */
  admin_password?:  string;
  /** Nombre del admin (por defecto 'Administrador') */
  admin_nombre?:    string;
}

export interface UpdateTenantDTO {
  nombre?:            string;
  slug?:              string;
  email_contacto?:    string;
  telefono?:          string;
  plan_id?:           number;
  estado?:            'pruebas' | 'activo' | 'suspendido';
  fecha_pago?:        string;
  fecha_suspension?:  string;
  notas?:             string;
  /** Override del límite de sucursales. NULL = usar el límite del plan. */
  max_sucursales?:    number | null;
  /** Override del límite de puntos de venta. NULL = usar el límite del plan. */
  max_puntos_venta?:  number | null;
  /** Override del límite de usuarios. NULL = usar el límite del plan. */
  max_usuarios?:      number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PAGOS ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreatePagoDTO {
  monto:                    number;
  fecha_pago?:              string;
  metodo?:                  string;
  notas?:                   string;
  /** Nueva fecha de vencimiento del tenant tras el pago */
  nueva_fecha_vencimiento?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── API MH ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface UpdateApiMhDTO {
  ambiente?:        string;
  url_auth?:        string;
  url_transmision?: string;
  usuario_api?:     string;
  password_api?:    string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── FIRMA DIGITAL ─────────────────────────────────────════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

/** DTO para actualizar solo los metadatos de la firma (contraseña, NIT, fecha). */
export interface UpdateFirmaMetaDTO {
  certificado_pass?:  string;
  nit_certificado?:   string;
  fecha_vencimiento?: string;
}
