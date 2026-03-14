/**
 * auth.controller.ts — Handlers HTTP para autenticación del SuperAdmin.
 *
 * Rutas:
 *   POST /superadmin/auth/login          → postLogin (paso 1)
 *   POST /superadmin/auth/2fa/login      → postLogin2FAVerify (paso 2 con TOTP)
 *   POST /superadmin/auth/logout         → postLogout
 *   GET  /superadmin/auth/me             → getMe
 *   POST /superadmin/auth/2fa/setup      → postSetup2FA
 *   POST /superadmin/auth/2fa/verify-setup → postVerify2FA
 *   POST /superadmin/auth/2fa/disable    → postDisable2FA
 */

import { Request, Response, NextFunction } from 'express';

import * as authService from '../services/auth.service';
import * as totpSvc     from '../totp.service';
import { logAudit, AUDIT_ACCIONES } from '../../utils/audit';

const SA_COOKIE_NAME = 'erp_superadmin_token';
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8 horas en ms
// SameSite=None + Secure requerido en producción para cookies cross-domain (Vercel→Render)
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = { sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax', secure: IS_PROD };

// ── Autenticación ─────────────────────────────────────────────────────────────

/**
 * POST /superadmin/auth/login — Paso 1.
 * Si el superadmin tiene 2FA activo, devuelve un tempToken de 5 min.
 * El cliente deberá llamar a /auth/2fa/login con ese token + código TOTP.
 */
export async function postLogin(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { username, password } = req.body;
    const { payload, totpEnabled } = await authService.loginSuperAdminFull(username, password);

    // 2FA activo → emitir token temporal, no la cookie de sesión
    if (totpEnabled) {
      const tempToken = totpSvc.signTempToken(payload.id);
      res.json({ requires2FA: true, tempToken });
      return;
    }

    // Sin 2FA → flujo directo, establecer cookie de sesión
    const token = authService.signSuperAdminToken(payload);
    res.cookie(SA_COOKIE_NAME, token, { httpOnly: true, ...COOKIE_OPTS, maxAge: COOKIE_MAX_AGE });
    await logAudit({ actorId: payload.id, actorTipo: 'superadmin', accion: AUDIT_ACCIONES.LOGIN_SUPERADMIN, ip: req.ip });

    res.json(payload);
  } catch (err) { next(err); }
}

/**
 * POST /superadmin/auth/2fa/login — Paso 2.
 * Recibe el tempToken del paso 1 y el código TOTP de 6 dígitos.
 * Si son válidos, establece la cookie de sesión real.
 */
export async function postLogin2FAVerify(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { tempToken, code } = req.body as { tempToken?: string; code?: string };
    if (!tempToken || !code) {
      res.status(400).json({ message: 'tempToken y code son requeridos' });
      return;
    }

    let tokenPayload: totpSvc.TempToken2FAPayload;
    try {
      tokenPayload = totpSvc.verifyTempToken(tempToken);
    } catch {
      res.status(401).json({ message: 'Token temporal inválido o expirado. Vuelve a iniciar sesión.' });
      return;
    }

    const totpStatus = await totpSvc.getTotpStatus(tokenPayload.sub);
    if (!totpStatus?.totp_enabled || !totpStatus.totp_secret) {
      res.status(400).json({ message: 'El 2FA no está correctamente configurado' });
      return;
    }
    if (!totpSvc.verifyTotpCode(totpStatus.totp_secret, code)) {
      res.status(401).json({ message: 'Código de verificación incorrecto' });
      return;
    }

    const sessionPayload = await authService.getSuperAdminById(tokenPayload.sub);
    const token          = authService.signSuperAdminToken(sessionPayload);

    res.cookie(SA_COOKIE_NAME, token, { httpOnly: true, ...COOKIE_OPTS, maxAge: COOKIE_MAX_AGE });
    await logAudit({ actorId: sessionPayload.id, actorTipo: 'superadmin', accion: AUDIT_ACCIONES.LOGIN_SUPERADMIN, ip: req.ip });

    res.json(sessionPayload);
  } catch (err) { next(err); }
}

/** POST /superadmin/auth/logout — Elimina la cookie de sesión. */
export function postLogout(_req: Request, res: Response): void {
  res.clearCookie(SA_COOKIE_NAME);
  res.json({ ok: true });
}

/** GET /superadmin/auth/me — Devuelve los datos del superadmin autenticado. */
export function getMe(req: Request, res: Response): void {
  res.json(req.superAdmin);
}

// ── 2FA — Gestión del TOTP ────────────────────────────────────────────────────

/**
 * POST /superadmin/auth/2fa/setup
 * Genera secreto TOTP + QR. Guarda el secreto cifrado sin activar el 2FA.
 */
export async function postSetup2FA(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const superAdminId = req.superAdmin!.id;
    const status = await totpSvc.getTotpStatus(superAdminId);
    if (status?.totp_enabled) {
      res.status(400).json({ message: 'El 2FA ya está habilitado. Desactívalo primero.' });
      return;
    }
    const { qrUrl, secret } = await totpSvc.generateTotpSecret(req.superAdmin!.username);
    await totpSvc.saveTotpSecret(superAdminId, secret);
    // El secreto en texto plano solo se devuelve aquí — no se vuelve a exponer
    res.json({ qrUrl, secret });
  } catch (err) { next(err); }
}

/**
 * POST /superadmin/auth/2fa/verify-setup
 * Verifica el código TOTP y activa el 2FA si es correcto.
 */
export async function postVerify2FA(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const superAdminId = req.superAdmin!.id;
    const { code } = req.body as { code?: string };
    if (!code) { res.status(400).json({ message: 'El código es requerido' }); return; }

    const status = await totpSvc.getTotpStatus(superAdminId);
    if (!status?.totp_secret) {
      res.status(400).json({ message: 'No hay secreto pendiente. Inicia el proceso de configuración primero.' });
      return;
    }
    if (status.totp_enabled) {
      res.status(400).json({ message: 'El 2FA ya está habilitado.' });
      return;
    }
    if (!totpSvc.verifyTotpCode(status.totp_secret, code)) {
      res.status(401).json({ message: 'Código incorrecto. Verifica que la hora de tu dispositivo sea correcta.' });
      return;
    }
    await totpSvc.enableTotp(superAdminId);
    res.json({ ok: true, message: 'Autenticación de dos factores activada correctamente.' });
  } catch (err) { next(err); }
}

/**
 * POST /superadmin/auth/2fa/disable
 * Desactiva el 2FA. Requiere el código TOTP actual para confirmar.
 */
export async function postDisable2FA(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const superAdminId = req.superAdmin!.id;
    const { code } = req.body as { code?: string };
    if (!code) { res.status(400).json({ message: 'El código de verificación es requerido para desactivar el 2FA' }); return; }

    const status = await totpSvc.getTotpStatus(superAdminId);
    if (!status?.totp_enabled || !status.totp_secret) {
      res.status(400).json({ message: 'El 2FA no está habilitado.' });
      return;
    }
    if (!totpSvc.verifyTotpCode(status.totp_secret, code)) {
      res.status(401).json({ message: 'Código incorrecto. No se pudo desactivar el 2FA.' });
      return;
    }
    await totpSvc.disableTotp(superAdminId);
    res.json({ ok: true, message: 'Autenticación de dos factores desactivada.' });
  } catch (err) { next(err); }
}
