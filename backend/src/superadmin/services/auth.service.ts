/**
 * auth.service.ts — Lógica de autenticación del SuperAdmin.
 *
 * Maneja:
 *   - Login con validación de credenciales (bcrypt)
 *   - Estado de 2FA (TOTP)
 *   - Firma del JWT de sesión
 *   - Consulta del superadmin por ID (para paso 2 del login)
 */

import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';

import { pool }                  from '../../config/database';
import { env }                   from '../../config/env';
import { AppError }              from '../../middleware/errorHandler';
import { SuperAdminJwtPayload }  from '../../middleware/auth.middleware';

// ═══════════════════════════════════════════════════════════════════════════════
// ── LOGIN ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valida las credenciales del superadmin y devuelve el payload JWT + estado 2FA.
 * Usado por el paso 1 del login para decidir si se requiere TOTP.
 */
export async function loginSuperAdminFull(
  username: string,
  password: string,
): Promise<{ payload: SuperAdminJwtPayload; totpEnabled: boolean; totpSecret: string | null }> {
  const { rows } = await pool.query(
    `SELECT id, nombre, username, password_hash, activo, totp_enabled, totp_secret
     FROM superadmin_users WHERE username = $1`,
    [username],
  );

  const sa = rows[0];
  if (!sa || !sa.activo) throw new AppError('Credenciales inválidas', 401);

  const valid = await bcrypt.compare(password, sa.password_hash);
  if (!valid) throw new AppError('Credenciales inválidas', 401);

  return {
    payload:     { id: sa.id, username: sa.username, nombre: sa.nombre },
    totpEnabled: sa.totp_enabled,
    totpSecret:  sa.totp_secret,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── TOKEN ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Firma el JWT de sesión del superadmin.
 * Duración: 8 horas.
 */
export function signSuperAdminToken(payload: SuperAdminJwtPayload): string {
  return jwt.sign(payload, env.SUPERADMIN_JWT_SECRET, { expiresIn: '8h' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── CONSULTA POR ID ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el payload de sesión de un superadmin por su ID.
 * Usado en el paso 2 del login (verificación TOTP) para construir el JWT.
 */
export async function getSuperAdminById(
  id: number,
): Promise<SuperAdminJwtPayload> {
  const { rows } = await pool.query(
    `SELECT id, nombre, username FROM superadmin_users WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw new AppError('Usuario no encontrado', 401);
  return { id: rows[0].id, username: rows[0].username, nombre: rows[0].nombre };
}
