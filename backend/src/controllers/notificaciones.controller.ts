/**
 * notificaciones.controller.ts — Genera notificaciones derivadas del estado real de la DB.
 *
 * No requiere tabla propia: las notificaciones se derivan al vuelo de:
 *   - Productos sin stock
 *   - Lotes por vencer en ≤7 días (urgente)
 *   - Lotes por vencer en 8-30 días
 *   - Facturas en borrador sin procesar
 *
 * GET /api/notificaciones
 *   → { total, urgentes, notificaciones[] }
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

export async function getNotificaciones(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;

    const [sinStock, porVencerUrgente, porVencer30, facturasBorrador] = await Promise.all([

      // ── Productos sin ningún lote con stock > 0 ────────────────────────────
      pool.query<{ nombre: string }>(
        `SELECT p.nombre
         FROM productos p
         WHERE p.tenant_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM inventario i
             WHERE i.producto_id = p.id AND i.cantidad > 0
           )
         ORDER BY p.nombre
         LIMIT 10`,
        [tenantId],
      ),

      // ── Lotes que vencen en los próximos 7 días ────────────────────────────
      pool.query<{ nombre: string; lote: string | null; dias: number }>(
        `SELECT
           p.nombre,
           i.lote,
           (i.fecha_vencimiento - CURRENT_DATE)::INT AS dias
         FROM inventario i
         JOIN productos p ON p.id = i.producto_id
         WHERE p.tenant_id = $1
           AND i.fecha_vencimiento IS NOT NULL
           AND i.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
           AND i.cantidad > 0
         ORDER BY i.fecha_vencimiento ASC
         LIMIT 10`,
        [tenantId],
      ),

      // ── Lotes que vencen entre 8 y 30 días ────────────────────────────────
      pool.query<{ nombre: string; lote: string | null; dias: number }>(
        `SELECT
           p.nombre,
           i.lote,
           (i.fecha_vencimiento - CURRENT_DATE)::INT AS dias
         FROM inventario i
         JOIN productos p ON p.id = i.producto_id
         WHERE p.tenant_id = $1
           AND i.fecha_vencimiento IS NOT NULL
           AND i.fecha_vencimiento > CURRENT_DATE + INTERVAL '7 days'
           AND i.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days'
           AND i.cantidad > 0
         ORDER BY i.fecha_vencimiento ASC
         LIMIT 10`,
        [tenantId],
      ),

      // ── Facturas en borrador sin enviar ────────────────────────────────────
      pool.query<{ numero_dte: string; cliente: string; fecha_emision: string }>(
        `SELECT
           f.numero_dte,
           COALESCE(c.nombre_completo, f.receptor_nombre, 'Sin nombre') AS cliente,
           f.fecha_emision::TEXT
         FROM facturas f
         LEFT JOIN clientes c ON f.cliente_id = c.id
         WHERE f.tenant_id = $1 AND f.estado = 'borrador'
         ORDER BY f.created_at DESC
         LIMIT 10`,
        [tenantId],
      ),
    ]);

    // ── Construir lista de notificaciones ─────────────────────────────────────

    const notificaciones: Array<{
      id:      string;
      tipo:    'danger' | 'warning' | 'info';
      titulo:  string;
      mensaje: string;
      count:   number;
      items:   string[];
      ruta:    string;
    }> = [];

    const ssCount = sinStock.rowCount ?? 0;
    if (ssCount > 0) {
      notificaciones.push({
        id:      'sin_stock',
        tipo:    'danger',
        titulo:  `${ssCount} producto${ssCount !== 1 ? 's' : ''} sin stock`,
        mensaje: 'Sin existencias en inventario. Considera hacer una orden de compra.',
        count:   ssCount,
        items:   sinStock.rows.map(r => r.nombre),
        ruta:    '/inventario',
      });
    }

    const pvuCount = porVencerUrgente.rowCount ?? 0;
    if (pvuCount > 0) {
      notificaciones.push({
        id:      'por_vencer_urgente',
        tipo:    'danger',
        titulo:  `${pvuCount} lote${pvuCount !== 1 ? 's' : ''} vence${pvuCount === 1 ? 'n' : ''} esta semana`,
        mensaje: 'Vencen en los próximos 7 días. Revisa y actúa antes de que expire.',
        count:   pvuCount,
        items:   porVencerUrgente.rows.map(r =>
          `${r.nombre}${r.lote ? ` — ${r.lote}` : ''} (${r.dias} día${r.dias !== 1 ? 's' : ''})`
        ),
        ruta:    '/inventario',
      });
    }

    const pv30Count = porVencer30.rowCount ?? 0;
    if (pv30Count > 0) {
      notificaciones.push({
        id:      'por_vencer_30',
        tipo:    'warning',
        titulo:  `${pv30Count} lote${pv30Count !== 1 ? 's' : ''} por vencer este mes`,
        mensaje: 'Vencen entre 8 y 30 días. Planifica la rotación de inventario.',
        count:   pv30Count,
        items:   porVencer30.rows.map(r =>
          `${r.nombre}${r.lote ? ` — ${r.lote}` : ''} (${r.dias} días)`
        ),
        ruta:    '/inventario',
      });
    }

    const fbCount = facturasBorrador.rowCount ?? 0;
    if (fbCount > 0) {
      notificaciones.push({
        id:      'facturas_borrador',
        tipo:    'info',
        titulo:  `${fbCount} factura${fbCount !== 1 ? 's' : ''} pendiente${fbCount !== 1 ? 's' : ''}`,
        mensaje: 'Facturas en borrador sin enviar a Hacienda (MH).',
        count:   fbCount,
        items:   facturasBorrador.rows.map(r => `${r.numero_dte} — ${r.cliente}`),
        ruta:    '/facturacion',
      });
    }

    res.json({
      total:        notificaciones.length,
      urgentes:     notificaciones.filter(n => n.tipo === 'danger').length,
      notificaciones,
    });
  } catch (err) { next(err); }
}
