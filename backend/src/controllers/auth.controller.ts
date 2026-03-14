/**
 * auth.controller.ts — Handlers HTTP para /api/auth
 *
 *  GET  /api/auth/tenant/:slug → getTenant   (público, verifica slug antes del login)
 *  POST /api/auth/login        → postLogin   (recibe tenant_slug + username + password)
 *  POST /api/auth/logout       → postLogout
 *  GET  /api/auth/me           → getMe       (requireAuth)
 */

import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/auth.service';

const COOKIE_NAME    = 'erp_token';
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8 horas en ms
// SameSite=None + Secure requerido en producción para cookies cross-domain (Vercel→Render)
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = { sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax', secure: IS_PROD };

/**
 * GET /api/auth/tenant/:slug
 * Verifica que el slug de empresa exista y devuelve info pública del tenant.
 * El frontend la usa para mostrar el nombre de la empresa en el login.
 */
export async function getTenant(req: Request, res: Response): Promise<void> {
  const slug = req.params.slug as string;
  const tenant = await svc.getTenantBySlug(slug);

  if (!tenant) {
    res.status(404).json({ message: 'Empresa no encontrada' });
    return;
  }

  res.json(tenant);
}

export async function postLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password, tenant_slug } = req.body;

    if (!username || !password || !tenant_slug) {
      res.status(400).json({ message: 'Username, password y código de empresa son requeridos' });
      return;
    }

    const payload = await svc.login(username, password, tenant_slug);
    const token   = svc.signToken(payload);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      ...COOKIE_OPTS,
      maxAge:   COOKIE_MAX_AGE,
    });

    res.json(payload);
  } catch (e: any) {
    res.status(401).json({ message: e.message || 'Error de autenticación' });
  }
}

export function postLogout(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

export function getMe(req: Request, res: Response): void {
  res.json(req.user);
}

/**
 * POST /api/auth/impersonate
 * Canjeamos el token temporal generado por el superadmin
 * y lo ponemos como cookie erp_token para iniciar la sesión.
 * Body: { token: string }
 */
export async function postImpersonateLogin(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Token requerido' });
      return;
    }

    // Verificar que el token sea válido (usa el mismo secreto JWT del ERP)
    const payload = await svc.verifyToken(token);

    // Colocar el token como cookie — dura lo que quede de los 15 minutos
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      ...COOKIE_OPTS,
      maxAge:   15 * 60 * 1000,
    });

    res.json(payload);
  } catch (e: any) {
    res.status(401).json({ message: 'Token de impersonación inválido o expirado' });
  }
}
