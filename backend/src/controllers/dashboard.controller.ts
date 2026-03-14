/**
 * dashboard.controller.ts — Endpoint único para el Dashboard ERP.
 *
 * GET /api/dashboard
 *   Devuelve en una sola llamada todos los datos necesarios:
 *   - KPIs: ventas hoy/mes/mes-anterior, facturas pendientes, inventario, etc.
 *   - ventas_por_dia: últimos 30 días (con días sin ventas como 0)
 *   - top_productos: top 5 del mes por monto
 *   - ventas_por_tipo: distribución por tipo DTE del mes
 *   - actividad_reciente: últimas 8 transacciones (facturas + compras)
 *   - modulo_counts: conteos para las tarjetas de acceso rápido
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;

    const [
      kpisFacturas,
      kpisInventario,
      kpisClientes,
      kpisCompras,
      ventasPorDia,
      topProductos,
      ventasPorTipo,
      actividadReciente,
      moduloCounts,
    ] = await Promise.all([

      // ── KPIs de facturación ─────────────────────────────────────────────────
      pool.query<{
        ventas_hoy: string; ventas_mes: string;
        ventas_mes_anterior: string; facturas_borrador: string;
      }>(
        `SELECT
           COALESCE(SUM(total) FILTER (
             WHERE fecha_emision::DATE = CURRENT_DATE AND estado = 'facturado'
           ), 0) AS ventas_hoy,
           COALESCE(SUM(total) FILTER (
             WHERE DATE_TRUNC('month', fecha_emision) = DATE_TRUNC('month', CURRENT_DATE)
               AND estado = 'facturado'
           ), 0) AS ventas_mes,
           COALESCE(SUM(total) FILTER (
             WHERE DATE_TRUNC('month', fecha_emision) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
               AND estado = 'facturado'
           ), 0) AS ventas_mes_anterior,
           COUNT(*) FILTER (WHERE estado = 'borrador') AS facturas_borrador
         FROM facturas
         WHERE tenant_id = $1`,
        [tenantId],
      ),

      // ── KPIs de inventario ─────────────────────────────────────────────────
      pool.query<{
        valor_inventario: string; productos_sin_stock: string; lotes_por_vencer: string;
      }>(
        `SELECT
           COALESCE(SUM(i.cantidad * i.precio_unitario), 0) AS valor_inventario,
           COUNT(DISTINCT p.id) FILTER (
             WHERE NOT EXISTS (
               SELECT 1 FROM inventario i2 WHERE i2.producto_id = p.id AND i2.cantidad > 0
             )
           ) AS productos_sin_stock,
           COUNT(i.id) FILTER (
             WHERE i.fecha_vencimiento IS NOT NULL
               AND i.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
               AND i.cantidad > 0
           ) AS lotes_por_vencer
         FROM productos p
         LEFT JOIN inventario i ON p.id = i.producto_id
         WHERE p.tenant_id = $1`,
        [tenantId],
      ),

      // ── KPIs de clientes ───────────────────────────────────────────────────
      pool.query<{ total_clientes: string }>(
        `SELECT COUNT(*)::TEXT AS total_clientes FROM clientes WHERE tenant_id = $1`,
        [tenantId],
      ),

      // ── KPIs de compras ────────────────────────────────────────────────────
      pool.query<{ compras_mes: string }>(
        `SELECT COALESCE(SUM(total), 0) AS compras_mes
         FROM compras
         WHERE tenant_id = $1
           AND DATE_TRUNC('month', fecha_compra) = DATE_TRUNC('month', CURRENT_DATE)`,
        [tenantId],
      ),

      // ── Ventas por día — últimos 30 días (generate_series rellena días vacíos) ──
      pool.query<{ fecha: string; total: string }>(
        `SELECT
           TO_CHAR(d.fecha, 'YYYY-MM-DD') AS fecha,
           COALESCE(SUM(f.total), 0)       AS total
         FROM generate_series(
           CURRENT_DATE - INTERVAL '29 days',
           CURRENT_DATE,
           INTERVAL '1 day'
         ) AS d(fecha)
         LEFT JOIN facturas f
           ON f.fecha_emision::DATE = d.fecha
          AND f.tenant_id = $1
          AND f.estado = 'facturado'
         GROUP BY d.fecha
         ORDER BY d.fecha ASC`,
        [tenantId],
      ),

      // ── Top 5 productos más vendidos del mes actual ────────────────────────
      pool.query<{ nombre: string; total: string }>(
        `SELECT
           p.nombre,
           SUM(fd.total_linea) AS total
         FROM factura_detalles fd
         JOIN productos p ON fd.producto_id = p.id
         JOIN facturas   f ON fd.factura_id  = f.id
         WHERE f.tenant_id = $1
           AND f.estado = 'facturado'
           AND DATE_TRUNC('month', f.fecha_emision) = DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY p.id, p.nombre
         ORDER BY total DESC
         LIMIT 5`,
        [tenantId],
      ),

      // ── Ventas por tipo DTE — mes actual ────────────────────────────────────
      pool.query<{ tipo_dte: string; total: string }>(
        `SELECT
           tipo_dte,
           SUM(total) AS total
         FROM facturas
         WHERE tenant_id = $1
           AND estado = 'facturado'
           AND DATE_TRUNC('month', fecha_emision) = DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY tipo_dte
         ORDER BY total DESC`,
        [tenantId],
      ),

      // ── Actividad reciente: últimas 5 facturas + últimas 3 compras ──────────
      pool.query(
        `SELECT tipo, referencia, total, fecha, estado FROM (
           SELECT
             'factura'    AS tipo,
             numero_dte   AS referencia,
             total,
             fecha_emision::TEXT AS fecha,
             estado,
             created_at
           FROM facturas WHERE tenant_id = $1
           ORDER BY created_at DESC LIMIT 5
         ) f
         UNION ALL
         SELECT tipo, referencia, total, fecha, estado FROM (
           SELECT
             'compra'   AS tipo,
             orden_compra AS referencia,
             total,
             fecha_compra::TEXT AS fecha,
             estado,
             created_at
           FROM compras WHERE tenant_id = $1
           ORDER BY created_at DESC LIMIT 3
         ) c
         ORDER BY fecha DESC LIMIT 8`,
        [tenantId],
      ),

      // ── Conteos para las tarjetas de módulos ────────────────────────────────
      pool.query<{
        facturas_pendientes: string; compras_mes: string;
        total_clientes: string;      total_productos: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM facturas WHERE tenant_id = $1 AND estado = 'borrador')::TEXT      AS facturas_pendientes,
           (SELECT COUNT(*) FROM compras  WHERE tenant_id = $1
              AND DATE_TRUNC('month', fecha_compra) = DATE_TRUNC('month', CURRENT_DATE))::TEXT    AS compras_mes,
           (SELECT COUNT(*) FROM clientes  WHERE tenant_id = $1)::TEXT                            AS total_clientes,
           (SELECT COUNT(*) FROM productos WHERE tenant_id = $1)::TEXT                            AS total_productos`,
        [tenantId],
      ),
    ]);

    const kf  = kpisFacturas.rows[0];
    const ki  = kpisInventario.rows[0];
    const kc  = kpisClientes.rows[0];
    const kco = kpisCompras.rows[0];
    const mc  = moduloCounts.rows[0];

    res.json({
      kpis: {
        ventas_hoy:          Number(kf.ventas_hoy),
        ventas_mes:          Number(kf.ventas_mes),
        ventas_mes_anterior: Number(kf.ventas_mes_anterior),
        facturas_borrador:   Number(kf.facturas_borrador),
        valor_inventario:    Number(ki.valor_inventario),
        productos_sin_stock: Number(ki.productos_sin_stock),
        lotes_por_vencer:    Number(ki.lotes_por_vencer),
        total_clientes:      Number(kc.total_clientes),
        compras_mes:         Number(kco.compras_mes),
      },
      ventas_por_dia: ventasPorDia.rows.map(r => ({
        fecha: r.fecha,
        total: Number(r.total),
      })),
      top_productos: topProductos.rows.map(r => ({
        nombre: r.nombre,
        total:  Number(r.total),
      })),
      ventas_por_tipo: ventasPorTipo.rows.map(r => ({
        tipo_dte: r.tipo_dte,
        total:    Number(r.total),
      })),
      actividad_reciente: actividadReciente.rows.map(r => ({
        tipo:       r.tipo,
        referencia: r.referencia,
        total:      Number(r.total),
        fecha:      r.fecha,
        estado:     r.estado,
      })),
      modulo_counts: {
        facturas_pendientes: Number(mc.facturas_pendientes),
        compras_mes:         Number(mc.compras_mes),
        total_clientes:      Number(mc.total_clientes),
        total_productos:     Number(mc.total_productos),
      },
    });
  } catch (err) { next(err); }
}
