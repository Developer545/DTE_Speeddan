/**
 * auth.service.ts — Lógica de autenticación de usuarios del ERP (por tenant).
 *
 * login():           busca tenant por slug, verifica credenciales de usuario.
 * signToken():       genera JWT con tenantId, rol, etc.
 * getTenantBySlug(): util para verificar slug antes del login.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { env } from '../config/env';
import { JwtPayload } from '../middleware/auth.middleware';

/** Info básica del tenant que se envía al frontend para mostrar nombre de empresa. */
export interface TenantPublicInfo {
  id:     number;
  nombre: string;
  estado: 'pruebas' | 'activo' | 'suspendido';
  /** Fecha de próximo pago (para alertas en el frontend) */
  fecha_pago?:       string | null;
  fecha_suspension?: string | null;
}

/**
 * Busca un tenant por su slug.
 * Devuelve info pública para mostrar en la pantalla de login.
 * Retorna null si el slug no existe.
 */
export async function getTenantBySlug(slug: string): Promise<TenantPublicInfo | null> {
  const { rows } = await pool.query(
    `SELECT id, nombre, estado, fecha_pago, fecha_suspension
     FROM tenants WHERE slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

/**
 * Verifica credenciales del usuario dentro de su tenant.
 * El username es único por (tenant_id, username), no globalmente.
 * Lanza error si el tenant no existe, el usuario no existe,
 * la contraseña es incorrecta, o el usuario está inactivo.
 */
export async function login(
  username:  string,
  password:  string,
  tenantSlug: string
): Promise<JwtPayload> {
  // 1. Verificar que el tenant existe
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    throw new Error('Código de empresa no válido');
  }

  // 2. Buscar usuario dentro de ese tenant
  const { rows } = await pool.query(
    `SELECT id, nombre, username, password_hash, rol, activo
     FROM usuarios
     WHERE username = $1 AND tenant_id = $2`,
    [username, tenant.id]
  );

  const user = rows[0];

  // Misma respuesta genérica para usuario no existe o inactivo (evita enumeración)
  if (!user || !user.activo) {
    throw new Error('Credenciales inválidas');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Credenciales inválidas');
  }

  return {
    id:       user.id,
    username: user.username,
    nombre:   user.nombre,
    rol:      user.rol,
    tenantId: tenant.id,
  };
}

/** Genera JWT firmado con el secreto del ERP. Incluye tenantId en el payload. */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
}

/** Verifica y decodifica un token JWT del ERP (usado para canjear tokens de impersonación). */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
