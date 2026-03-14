/**
 * auth.middleware.ts — Middleware de autenticación.
 *
 * requireAuth       → verifica token JWT del ERP (cookie erp_token), inyecta req.user
 * requireAdmin      → verifica que req.user.rol sea 'admin'
 * requireSuperAdmin → verifica token JWT del superadmin (cookie erp_superadmin_token)
 *                     usa SUPERADMIN_JWT_SECRET distinto al del ERP
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// ── Payload del JWT normal (usuarios del ERP por tenant) ─────────────────────
export interface JwtPayload {
  id:       number;
  username: string;
  nombre:   string;
  rol:      'admin' | 'user';
  tenantId: number;
}

// ── Payload del JWT de superadmin ─────────────────────────────────────────────
export interface SuperAdminJwtPayload {
  id:       number;
  username: string;
  nombre:   string;
}

// Extender el tipo Request de Express para incluir req.user y req.superAdmin
declare global {
  namespace Express {
    interface Request {
      user?:       JwtPayload;
      superAdmin?: SuperAdminJwtPayload;
    }
  }
}

const ERP_COOKIE        = 'erp_token';
const SUPERADMIN_COOKIE = 'erp_superadmin_token';

/** Verifica el JWT del ERP (tenants). Inyecta req.user con tenantId. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.[ERP_COOKIE];

  if (!token) {
    res.status(401).json({ message: 'No autenticado' });
    return;
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

/** Verifica que req.user tenga rol 'admin' dentro del tenant. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.rol !== 'admin') {
    res.status(403).json({ message: 'Se requiere rol de administrador' });
    return;
  }
  next();
}

/**
 * Verifica el JWT del superadmin usando SUPERADMIN_JWT_SECRET.
 * Completamente independiente del sistema de tenants.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.[SUPERADMIN_COOKIE];

  if (!token) {
    res.status(401).json({ message: 'No autenticado como superadmin' });
    return;
  }

  try {
    req.superAdmin = jwt.verify(token, env.SUPERADMIN_JWT_SECRET) as SuperAdminJwtPayload;
    next();
  } catch {
    res.status(401).json({ message: 'Token de superadmin inválido o expirado' });
  }
}
