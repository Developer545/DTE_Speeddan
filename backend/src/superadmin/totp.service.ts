/**
 * totp.service.ts — Lógica TOTP (Time-based One-Time Password) para SuperAdmin.
 *
 * Funciones:
 *   - Generación de secreto TOTP y URL de código QR
 *   - Verificación de código TOTP con tolerancia de ±30 s
 *   - Persistencia del secreto (cifrado con AES-256) en la BD
 *   - Habilitación y deshabilitación del 2FA
 *   - Firma y verificación de tokens temporales "2fa-pending" (5 min)
 *
 * // npm install speakeasy qrcode @types/speakeasy @types/qrcode
 */

import * as speakeasy from 'speakeasy';
import * as QRCode    from 'qrcode';
import jwt            from 'jsonwebtoken';
import { pool }       from '../config/database';
import { env }        from '../config/env';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto';

/** Nombre del emisor que aparece en la app autenticadora (Google Authenticator, Authy, etc.) */
const TOTP_ISSUER = 'Facturacion DTE SuperAdmin';

/** Duración del token temporal 2FA-pending. Expira en 5 minutos. */
const TEMP_TOKEN_EXPIRES = '5m';

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Payload del JWT temporal emitido durante el flujo de 2FA. */
export interface TempToken2FAPayload {
  sub:     number;             // ID del superadmin
  purpose: '2fa-pending';
}

/** Resultado de generar el secreto TOTP para el setup. */
export interface Setup2FAResult {
  /** Data URL PNG del código QR — pasar directamente a <img src={qrUrl}> */
  qrUrl:  string;
  /** Clave secreta en Base32 para entrada manual en la app autenticadora */
  secret: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── GENERACIÓN Y VERIFICACIÓN ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera un nuevo secreto TOTP y la imagen QR correspondiente.
 * El secreto se devuelve en Base32 (sin cifrar) para mostrarlo al usuario una sola vez.
 */
export async function generateTotpSecret(username: string): Promise<Setup2FAResult> {
  const secretObj = speakeasy.generateSecret({
    length: 20,
    name:   `${TOTP_ISSUER} (${username})`,
    issuer: TOTP_ISSUER,
  });

  const qrUrl = await QRCode.toDataURL(secretObj.otpauth_url!);

  return { qrUrl, secret: secretObj.base32 };
}

/**
 * Verifica un código TOTP de 6 dígitos contra el secreto almacenado.
 * Acepta una ventana de ±1 intervalo (30 s) para tolerar desfases de reloj menores.
 *
 * @param secret - Secreto TOTP en Base32, puede estar cifrado con AES
 * @param code   - Código de 6 dígitos ingresado por el usuario
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const base32Secret = isEncrypted(secret) ? decrypt(secret) : secret;

  return speakeasy.totp.verify({
    secret:   base32Secret,
    encoding: 'base32',
    token:    code,
    window:   1,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── OPERACIONES EN BASE DE DATOS ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Guarda el secreto TOTP en la BD cifrado con AES-256, sin activar el 2FA aún.
 * Llamar después de mostrar el QR, antes de que el usuario confirme el código.
 */
export async function saveTotpSecret(superAdminId: number, secret: string): Promise<void> {
  const encryptedSecret = encrypt(secret);
  await pool.query(
    `UPDATE superadmin_users SET totp_secret = $1 WHERE id = $2`,
    [encryptedSecret, superAdminId]
  );
}

/**
 * Activa el 2FA para el superadmin.
 * Solo llamar después de verificar el código TOTP con éxito en el setup.
 */
export async function enableTotp(superAdminId: number): Promise<void> {
  await pool.query(
    `UPDATE superadmin_users SET totp_enabled = true WHERE id = $1`,
    [superAdminId]
  );
}

/**
 * Desactiva el 2FA y elimina el secreto TOTP del superadmin.
 */
export async function disableTotp(superAdminId: number): Promise<void> {
  await pool.query(
    `UPDATE superadmin_users
     SET totp_enabled = false, totp_secret = NULL
     WHERE id = $1`,
    [superAdminId]
  );
}

/**
 * Devuelve el estado de 2FA del superadmin desde la BD.
 */
export async function getTotpStatus(
  superAdminId: number
): Promise<{ totp_enabled: boolean; totp_secret: string | null } | null> {
  const { rows } = await pool.query(
    `SELECT totp_enabled, totp_secret FROM superadmin_users WHERE id = $1`,
    [superAdminId]
  );
  return rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── TOKEN TEMPORAL 2FA-PENDING ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera un JWT de corta duración (5 min) para el flujo de 2FA.
 * Se emite cuando las credenciales son correctas pero el usuario aún
 * debe ingresar su código TOTP antes de recibir la cookie de sesión.
 */
export function signTempToken(superAdminId: number): string {
  const payload: TempToken2FAPayload = { sub: superAdminId, purpose: '2fa-pending' };
  return jwt.sign(payload, env.SUPERADMIN_JWT_SECRET, { expiresIn: TEMP_TOKEN_EXPIRES });
}

/**
 * Verifica y decodifica un token temporal 2FA-pending.
 * Lanza error si el token es inválido, expirado o no es del tipo correcto.
 */
export function verifyTempToken(tempToken: string): TempToken2FAPayload {
  const payload = jwt.verify(tempToken, env.SUPERADMIN_JWT_SECRET) as unknown as TempToken2FAPayload;
  if (payload.purpose !== '2fa-pending') throw new Error('Token inválido');
  return payload;
}
