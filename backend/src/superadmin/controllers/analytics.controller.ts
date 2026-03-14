/**
 * analytics.controller.ts — Handlers HTTP para Analytics, Dashboard, Mapa y Auditoría.
 *
 * Rutas:
 *   GET /superadmin/dashboard → getDashboard
 *   GET /superadmin/analytics → getAnalytics
 *   GET /superadmin/mapa      → getMapaClientes
 *   GET /superadmin/health    → getHealth (proxy a system.controller)
 *   GET /superadmin/audit     → getAuditLog
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';

// ── Dashboard ─────────────────────────────────────────────────────────────────

/** GET /superadmin/dashboard — KPIs del panel principal (tenants, MRR, alertas). */
export async function getDashboard(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const stats = await analyticsService.getDashboardStats();
    res.json(stats);
  } catch (err) { next(err); }
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * GET /superadmin/analytics
 * Series temporales (ingresos, nuevos, actividad) + distribuciones por plan/estado + KPIs.
 */
export async function getAnalytics(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await analyticsService.getAnalytics();
    res.json(data);
  } catch (err) { next(err); }
}

// ── Mapa de clientes ──────────────────────────────────────────────────────────

/**
 * GET /superadmin/mapa
 * Distribución de tenants por departamento de El Salvador.
 */
export async function getMapaClientes(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await analyticsService.getMapaClientes();
    res.json(data);
  } catch (err) { next(err); }
}

// ── Visor de auditoría ────────────────────────────────────────────────────────

/**
 * GET /superadmin/audit
 * Lista paginada del audit_log con filtros opcionales:
 * page, limit, actor_tipo, accion, tenant_id, fecha_inicio, fecha_fin
 */
export async function getAuditLog(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const page  = Math.max(1,   parseInt(req.query.page  as string ?? '1',  10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string ?? '50', 10) || 50));

    const { actor_tipo, accion, tenant_id, fecha_inicio, fecha_fin } =
      req.query as Record<string, string | undefined>;

    const data = await analyticsService.getAuditLog(page, limit, {
      actor_tipo, accion, tenant_id, fecha_inicio, fecha_fin,
    });

    res.json(data);
  } catch (err) { next(err); }
}
