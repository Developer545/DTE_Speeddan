/**
 * audit.ts — Helper para registrar acciones en el audit_log.
 *
 * Uso:
 *   await logAudit({
 *     actorId:   req.superAdmin!.id,
 *     actorTipo: 'superadmin',
 *     accion:    'crear_tenant',
 *     tenantId:  tenant.id,
 *     detalle:   { nombre: tenant.nombre, slug: tenant.slug },
 *     ip:        req.ip,
 *   });
 *
 * Si falla, solo loguea el error — nunca interrumpe la operación principal.
 */

import { pool } from '../config/database';

export type AuditActorTipo = 'superadmin' | 'sistema';

export interface AuditEntry {
  actorId?:   number;
  actorTipo:  AuditActorTipo;
  accion:     string;
  tenantId?:  number | null;
  detalle?:   Record<string, unknown>;
  ip?:        string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor_id, actor_tipo, accion, tenant_id, detalle, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.actorId  ?? null,
        entry.actorTipo,
        entry.accion,
        entry.tenantId ?? null,
        entry.detalle  ? JSON.stringify(entry.detalle) : null,
        entry.ip       ?? null,
      ]
    );
  } catch (err) {
    // El audit log nunca debe romper el flujo principal
    console.error('[AuditLog] Error al registrar:', err);
  }
}

// ── Acciones estándar (constantes para evitar typos) ──────────────────────────

export const AUDIT_ACCIONES = {
  CREAR_TENANT:        'crear_tenant',
  ACTUALIZAR_TENANT:   'actualizar_tenant',
  SUSPENDER_TENANT:    'suspender_tenant',        // automático por cron
  ACTIVAR_TENANT:      'activar_tenant',
  REGISTRAR_PAGO:      'registrar_pago',
  CREAR_USUARIO:       'crear_usuario',
  ACTUALIZAR_USUARIO:  'actualizar_usuario',
  ELIMINAR_USUARIO:    'eliminar_usuario',
  RESET_PASSWORD:      'reset_password',
  IMPERSONAR_TENANT:   'impersonar_tenant',
  CREAR_SUCURSAL:      'crear_sucursal',
  ACTUALIZAR_DTE:      'actualizar_dte',
  LOGIN_SUPERADMIN:    'login_superadmin',
  LOGOUT_SUPERADMIN:   'logout_superadmin',
  BACKUP_EXITOSO:      'backup_exitoso',
  BACKUP_FALLIDO:      'backup_fallido',
} as const;
