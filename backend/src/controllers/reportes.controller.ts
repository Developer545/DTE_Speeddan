/**
 * reportes.controller.ts — Handlers HTTP para /api/reportes.
 *
 * Endpoints:
 *   GET /reportes/ventas                    → resumen + listado de facturas por período
 *   GET /reportes/ventas/top-clientes       → top 10 clientes por monto
 *   GET /reportes/ventas/top-productos      → top 10 productos por monto
 *   GET /reportes/ventas/por-tipo           → totales agrupados por tipo DTE
 *   GET /reportes/ventas/excel              → descarga Excel completo de ventas
 *   GET /reportes/inventario/stock          → stock actual con valorización
 *   GET /reportes/inventario/sin-stock      → productos sin existencias
 *   GET /reportes/inventario/lotes-por-vencer → lotes próximos a vencer
 *   GET /reportes/inventario/excel          → descarga Excel completo de inventario
 *   GET /reportes/compras                   → resumen + listado de órdenes por período
 *   GET /reportes/compras/top-proveedores   → top 10 proveedores por monto
 *   GET /reportes/compras/por-estado        → totales agrupados por estado
 *   GET /reportes/compras/excel             → descarga Excel completo de compras
 */

import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { pool } from '../config/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parsea y valida las fechas del query. Por defecto: primer día del mes actual hasta hoy. */
function parseFechas(query: Request['query']): { inicio: string; fin: string } {
  const hoy   = new Date();
  const defIn = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const defFin = hoy.toISOString().slice(0, 10);

  const inicio = (query.fecha_inicio as string) || defIn;
  const fin    = (query.fecha_fin   as string) || defFin;
  return { inicio, fin };
}

/** Aplica encabezado visual consistente a todas las hojas Excel. */
function estiloEncabezadoExcel(cell: ExcelJS.Cell): void {
  cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border    = {
    bottom: { style: 'thin', color: { argb: 'FF444444' } },
  };
}

// ── Ventas ────────────────────────────────────────────────────────────────────

/**
 * GET /api/reportes/ventas?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 * Resumen del período + listado de facturas (máx. 500 filas).
 */
export async function getVentas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const [resumen, detalle] = await Promise.all([
      // Resumen: totales del período
      pool.query<{
        total_facturas: string; total_ventas: string;
        total_iva: string;      total_retencion: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE estado = 'facturado')                           AS total_facturas,
           COALESCE(SUM(total)          FILTER (WHERE estado = 'facturado'), 0)   AS total_ventas,
           COALESCE(SUM(iva)            FILTER (WHERE estado = 'facturado'), 0)   AS total_iva,
           COALESCE(SUM(retencion_renta)FILTER (WHERE estado = 'facturado'), 0)   AS total_retencion
         FROM facturas
         WHERE tenant_id = $1 AND fecha_emision BETWEEN $2 AND $3`,
        [tenantId, inicio, fin],
      ),

      // Detalle: listado de facturas del período (500 más recientes)
      pool.query(
        `SELECT
           f.id,
           f.numero_dte,
           f.tipo_dte,
           f.fecha_emision,
           f.estado,
           f.subtotal,
           f.iva,
           COALESCE(f.retencion_renta, 0) AS retencion_renta,
           f.total,
           COALESCE(c.nombre_completo, f.receptor_nombre, 'Clientes Varios') AS cliente
         FROM facturas f
         LEFT JOIN clientes c ON f.cliente_id = c.id
         WHERE f.tenant_id = $1 AND f.fecha_emision BETWEEN $2 AND $3
         ORDER BY f.fecha_emision DESC, f.id DESC
         LIMIT 500`,
        [tenantId, inicio, fin],
      ),
    ]);

    res.json({
      periodo: { inicio, fin },
      resumen: {
        total_facturas:  Number(resumen.rows[0].total_facturas),
        total_ventas:    Number(resumen.rows[0].total_ventas),
        total_iva:       Number(resumen.rows[0].total_iva),
        total_retencion: Number(resumen.rows[0].total_retencion),
      },
      facturas: detalle.rows,
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/ventas/top-clientes?fecha_inicio=&fecha_fin=
 * Top 10 clientes por monto total facturado.
 */
export async function getTopClientes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const { rows } = await pool.query(
      `SELECT
         COALESCE(c.nombre_completo, f.receptor_nombre, 'Clientes Varios') AS cliente,
         COUNT(*)        AS total_facturas,
         SUM(f.total)    AS total_monto
       FROM facturas f
       LEFT JOIN clientes c ON f.cliente_id = c.id
       WHERE f.tenant_id = $1 AND f.estado = 'facturado'
         AND f.fecha_emision BETWEEN $2 AND $3
       GROUP BY COALESCE(c.nombre_completo, f.receptor_nombre, 'Clientes Varios')
       ORDER BY total_monto DESC
       LIMIT 10`,
      [tenantId, inicio, fin],
    );

    res.json(rows.map(r => ({
      cliente:        r.cliente,
      total_facturas: Number(r.total_facturas),
      total_monto:    Number(r.total_monto),
    })));
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/ventas/top-productos?fecha_inicio=&fecha_fin=
 * Top 10 productos más vendidos por monto.
 */
export async function getTopProductos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const { rows } = await pool.query(
      `SELECT
         p.nombre                   AS producto,
         SUM(fd.cantidad)           AS total_cantidad,
         SUM(fd.total_linea)        AS total_monto
       FROM factura_detalles fd
       JOIN productos p  ON fd.producto_id = p.id
       JOIN facturas   f ON fd.factura_id  = f.id
       WHERE f.tenant_id = $1 AND f.estado = 'facturado'
         AND f.fecha_emision BETWEEN $2 AND $3
       GROUP BY p.id, p.nombre
       ORDER BY total_monto DESC
       LIMIT 10`,
      [tenantId, inicio, fin],
    );

    res.json(rows.map(r => ({
      producto:        r.producto,
      total_cantidad:  Number(r.total_cantidad),
      total_monto:     Number(r.total_monto),
    })));
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/ventas/por-tipo?fecha_inicio=&fecha_fin=
 * Totales agrupados por tipo de DTE.
 */
export async function getVentasPorTipo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const { rows } = await pool.query(
      `SELECT
         tipo_dte,
         COUNT(*)     AS total_facturas,
         SUM(total)   AS total_monto
       FROM facturas
       WHERE tenant_id = $1 AND estado = 'facturado'
         AND fecha_emision BETWEEN $2 AND $3
       GROUP BY tipo_dte
       ORDER BY total_monto DESC`,
      [tenantId, inicio, fin],
    );

    res.json(rows.map(r => ({
      tipo_dte:       r.tipo_dte,
      total_facturas: Number(r.total_facturas),
      total_monto:    Number(r.total_monto),
    })));
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/ventas/excel?fecha_inicio=&fecha_fin=
 * Genera y descarga un archivo Excel con el reporte de ventas.
 */
export async function getVentasExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    // Cargar datos en paralelo
    const [facturas, topClientes, topProductos, porTipo] = await Promise.all([
      pool.query(
        `SELECT
           f.numero_dte, f.tipo_dte, f.fecha_emision::TEXT, f.estado,
           f.subtotal, f.iva, COALESCE(f.retencion_renta, 0) AS retencion_renta, f.total,
           COALESCE(c.nombre_completo, f.receptor_nombre, 'Clientes Varios') AS cliente
         FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id
         WHERE f.tenant_id = $1 AND f.fecha_emision BETWEEN $2 AND $3
         ORDER BY f.fecha_emision DESC, f.id DESC`,
        [tenantId, inicio, fin],
      ),
      pool.query(
        `SELECT COALESCE(c.nombre_completo, f.receptor_nombre, 'Clientes Varios') AS cliente,
                COUNT(*) AS total_facturas, SUM(f.total) AS total_monto
         FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id
         WHERE f.tenant_id = $1 AND f.estado = 'facturado'
           AND f.fecha_emision BETWEEN $2 AND $3
         GROUP BY COALESCE(c.nombre_completo, f.receptor_nombre, 'Clientes Varios')
         ORDER BY total_monto DESC LIMIT 10`,
        [tenantId, inicio, fin],
      ),
      pool.query(
        `SELECT p.nombre AS producto, SUM(fd.cantidad) AS total_cantidad, SUM(fd.total_linea) AS total_monto
         FROM factura_detalles fd
         JOIN productos p ON fd.producto_id = p.id
         JOIN facturas f ON fd.factura_id = f.id
         WHERE f.tenant_id = $1 AND f.estado = 'facturado'
           AND f.fecha_emision BETWEEN $2 AND $3
         GROUP BY p.id, p.nombre ORDER BY total_monto DESC LIMIT 10`,
        [tenantId, inicio, fin],
      ),
      pool.query(
        `SELECT tipo_dte, COUNT(*) AS total_facturas, SUM(total) AS total_monto
         FROM facturas WHERE tenant_id = $1 AND estado = 'facturado'
           AND fecha_emision BETWEEN $2 AND $3
         GROUP BY tipo_dte ORDER BY total_monto DESC`,
        [tenantId, inicio, fin],
      ),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ERP DTE Online';
    wb.created = new Date();

    // ── Hoja 1: Detalle de facturas ──────────────────────────────────────────
    const sh1 = wb.addWorksheet('Facturas');
    sh1.columns = [
      { header: 'N° DTE',       key: 'numero_dte',       width: 28 },
      { header: 'Tipo DTE',     key: 'tipo_dte',          width: 12 },
      { header: 'Fecha',        key: 'fecha_emision',     width: 14 },
      { header: 'Estado',       key: 'estado',            width: 12 },
      { header: 'Cliente',      key: 'cliente',           width: 30 },
      { header: 'Subtotal',     key: 'subtotal',          width: 14 },
      { header: 'IVA',          key: 'iva',               width: 12 },
      { header: 'Retención',    key: 'retencion_renta',   width: 12 },
      { header: 'Total',        key: 'total',             width: 14 },
    ];
    sh1.getRow(1).eachCell(estiloEncabezadoExcel);
    sh1.getRow(1).height = 22;

    for (const r of facturas.rows) {
      const row = sh1.addRow({
        numero_dte:     r.numero_dte,
        tipo_dte:       r.tipo_dte,
        fecha_emision:  r.fecha_emision,
        estado:         r.estado,
        cliente:        r.cliente,
        subtotal:       Number(r.subtotal),
        iva:            Number(r.iva),
        retencion_renta: Number(r.retencion_renta),
        total:          Number(r.total),
      });
      // Formato moneda para columnas numéricas
      ['subtotal', 'iva', 'retencion_renta', 'total'].forEach(k => {
        const cell = row.getCell(k);
        cell.numFmt = '"$"#,##0.00';
      });
    }

    // ── Hoja 2: Top clientes ─────────────────────────────────────────────────
    const sh2 = wb.addWorksheet('Top Clientes');
    sh2.columns = [
      { header: 'Cliente',          key: 'cliente',        width: 34 },
      { header: 'N° Facturas',      key: 'total_facturas', width: 14 },
      { header: 'Monto Total',      key: 'total_monto',    width: 16 },
    ];
    sh2.getRow(1).eachCell(estiloEncabezadoExcel);
    sh2.getRow(1).height = 22;
    for (const r of topClientes.rows) {
      const row = sh2.addRow({ cliente: r.cliente, total_facturas: Number(r.total_facturas), total_monto: Number(r.total_monto) });
      row.getCell('total_monto').numFmt = '"$"#,##0.00';
    }

    // ── Hoja 3: Top productos ────────────────────────────────────────────────
    const sh3 = wb.addWorksheet('Top Productos');
    sh3.columns = [
      { header: 'Producto',       key: 'producto',        width: 34 },
      { header: 'Cantidad Vendida', key: 'total_cantidad', width: 18 },
      { header: 'Monto Total',    key: 'total_monto',     width: 16 },
    ];
    sh3.getRow(1).eachCell(estiloEncabezadoExcel);
    sh3.getRow(1).height = 22;
    for (const r of topProductos.rows) {
      const row = sh3.addRow({ producto: r.producto, total_cantidad: Number(r.total_cantidad), total_monto: Number(r.total_monto) });
      row.getCell('total_monto').numFmt = '"$"#,##0.00';
    }

    // ── Hoja 4: Por tipo DTE ─────────────────────────────────────────────────
    const sh4 = wb.addWorksheet('Por Tipo DTE');
    sh4.columns = [
      { header: 'Tipo DTE',     key: 'tipo_dte',       width: 14 },
      { header: 'N° Facturas',  key: 'total_facturas', width: 14 },
      { header: 'Monto Total',  key: 'total_monto',    width: 16 },
    ];
    sh4.getRow(1).eachCell(estiloEncabezadoExcel);
    sh4.getRow(1).height = 22;
    for (const r of porTipo.rows) {
      const row = sh4.addRow({ tipo_dte: r.tipo_dte, total_facturas: Number(r.total_facturas), total_monto: Number(r.total_monto) });
      row.getCell('total_monto').numFmt = '"$"#,##0.00';
    }

    // Serializar y enviar
    const nombre = `Reporte_Ventas_${inicio}_${fin}.xlsx`;
    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

// ── Inventario ────────────────────────────────────────────────────────────────

/**
 * GET /api/reportes/inventario/stock
 * Stock actual de todos los productos con valorización.
 */
export async function getInventarioStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;

    const [resumen, detalle] = await Promise.all([
      // Resumen global
      pool.query<{
        total_productos: string; total_unidades: string;
        valor_total: string;    productos_sin_stock: string;
      }>(
        `SELECT
           COUNT(DISTINCT p.id)                                              AS total_productos,
           COALESCE(SUM(i.cantidad), 0)                                      AS total_unidades,
           COALESCE(SUM(i.cantidad * i.precio_unitario), 0)                  AS valor_total,
           COUNT(DISTINCT p.id) FILTER (
             WHERE NOT EXISTS (
               SELECT 1 FROM inventario i2 WHERE i2.producto_id = p.id AND i2.cantidad > 0
             )
           )                                                                  AS productos_sin_stock
         FROM productos p
         LEFT JOIN inventario i ON p.id = i.producto_id
         WHERE p.tenant_id = $1`,
        [tenantId],
      ),

      // Detalle por producto
      pool.query(
        `SELECT
           p.id,
           p.nombre,
           COALESCE(SUM(i.cantidad), 0)                        AS stock_actual,
           COALESCE(MAX(i.precio_unitario), 0)                 AS precio_unitario,
           COALESCE(SUM(i.cantidad * i.precio_unitario), 0)    AS valor_inventario
         FROM productos p
         LEFT JOIN inventario i ON p.id = i.producto_id
         WHERE p.tenant_id = $1
         GROUP BY p.id, p.nombre
         ORDER BY valor_inventario DESC, p.nombre ASC`,
        [tenantId],
      ),
    ]);

    res.json({
      resumen: {
        total_productos:    Number(resumen.rows[0].total_productos),
        total_unidades:     Number(resumen.rows[0].total_unidades),
        valor_total:        Number(resumen.rows[0].valor_total),
        productos_sin_stock: Number(resumen.rows[0].productos_sin_stock),
      },
      productos: detalle.rows.map(r => ({
        id:              r.id,
        nombre:          r.nombre,
        stock_actual:    Number(r.stock_actual),
        precio_unitario: Number(r.precio_unitario),
        valor_inventario: Number(r.valor_inventario),
      })),
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/inventario/sin-stock
 * Productos sin existencias en inventario.
 */
export async function getProductosSinStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;

    const { rows } = await pool.query(
      `SELECT p.id, p.nombre
       FROM productos p
       WHERE p.tenant_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM inventario i WHERE i.producto_id = p.id AND i.cantidad > 0
         )
       ORDER BY p.nombre`,
      [tenantId],
    );

    res.json(rows);
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/inventario/lotes-por-vencer?dias=30
 * Lotes de inventario que vencen en los próximos N días.
 */
export async function getLotesPorVencer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const dias     = Math.max(1, parseInt((req.query.dias as string) || '30', 10));

    const { rows } = await pool.query(
      `SELECT
         p.nombre                                                     AS producto,
         i.lote,
         i.fecha_vencimiento::TEXT                                    AS fecha_vencimiento,
         i.cantidad,
         i.precio_unitario,
         (i.fecha_vencimiento - CURRENT_DATE)::INT                    AS dias_restantes
       FROM inventario i
       JOIN productos p ON i.producto_id = p.id
       WHERE p.tenant_id = $1
         AND i.fecha_vencimiento IS NOT NULL
         AND i.fecha_vencimiento <= CURRENT_DATE + ($2 || ' days')::INTERVAL
         AND i.cantidad > 0
       ORDER BY i.fecha_vencimiento ASC`,
      [tenantId, dias],
    );

    res.json(rows.map(r => ({
      producto:          r.producto,
      lote:              r.lote,
      fecha_vencimiento: r.fecha_vencimiento,
      cantidad:          Number(r.cantidad),
      precio_unitario:   Number(r.precio_unitario),
      dias_restantes:    Number(r.dias_restantes),
    })));
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/inventario/excel
 * Genera y descarga un archivo Excel con el reporte de inventario.
 */
export async function getInventarioExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const dias     = Math.max(1, parseInt((req.query.dias as string) || '30', 10));

    const [stock, sinStock, lotes] = await Promise.all([
      pool.query(
        `SELECT p.id, p.nombre,
                COALESCE(SUM(i.cantidad), 0) AS stock_actual,
                COALESCE(MAX(i.precio_unitario), 0) AS precio_unitario,
                COALESCE(SUM(i.cantidad * i.precio_unitario), 0) AS valor_inventario
         FROM productos p LEFT JOIN inventario i ON p.id = i.producto_id
         WHERE p.tenant_id = $1
         GROUP BY p.id, p.nombre ORDER BY valor_inventario DESC, p.nombre`,
        [tenantId],
      ),
      pool.query(
        `SELECT p.id, p.nombre FROM productos p
         WHERE p.tenant_id = $1
           AND NOT EXISTS (SELECT 1 FROM inventario i WHERE i.producto_id = p.id AND i.cantidad > 0)
         ORDER BY p.nombre`,
        [tenantId],
      ),
      pool.query(
        `SELECT p.nombre AS producto, i.lote, i.fecha_vencimiento::TEXT, i.cantidad,
                i.precio_unitario, (i.fecha_vencimiento - CURRENT_DATE)::INT AS dias_restantes
         FROM inventario i JOIN productos p ON i.producto_id = p.id
         WHERE p.tenant_id = $1
           AND i.fecha_vencimiento IS NOT NULL
           AND i.fecha_vencimiento <= CURRENT_DATE + ($2 || ' days')::INTERVAL
           AND i.cantidad > 0
         ORDER BY i.fecha_vencimiento ASC`,
        [tenantId, dias],
      ),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ERP DTE Online';
    wb.created = new Date();

    // ── Hoja 1: Stock actual ─────────────────────────────────────────────────
    const sh1 = wb.addWorksheet('Stock Actual');
    sh1.columns = [
      { header: 'Producto',         key: 'nombre',            width: 34 },
      { header: 'Stock Actual',     key: 'stock_actual',      width: 14 },
      { header: 'Precio Unitario',  key: 'precio_unitario',   width: 16 },
      { header: 'Valor Inventario', key: 'valor_inventario',  width: 18 },
    ];
    sh1.getRow(1).eachCell(estiloEncabezadoExcel);
    sh1.getRow(1).height = 22;
    for (const r of stock.rows) {
      const row = sh1.addRow({
        nombre:           r.nombre,
        stock_actual:     Number(r.stock_actual),
        precio_unitario:  Number(r.precio_unitario),
        valor_inventario: Number(r.valor_inventario),
      });
      row.getCell('precio_unitario').numFmt  = '"$"#,##0.00';
      row.getCell('valor_inventario').numFmt = '"$"#,##0.00';
    }

    // ── Hoja 2: Sin stock ────────────────────────────────────────────────────
    const sh2 = wb.addWorksheet('Sin Stock');
    sh2.columns = [
      { header: '#',        key: 'num',    width: 6  },
      { header: 'Producto', key: 'nombre', width: 40 },
    ];
    sh2.getRow(1).eachCell(estiloEncabezadoExcel);
    sh2.getRow(1).height = 22;
    sinStock.rows.forEach((r, i) => sh2.addRow({ num: i + 1, nombre: r.nombre }));

    // ── Hoja 3: Lotes por vencer ─────────────────────────────────────────────
    const sh3 = wb.addWorksheet(`Vencen en ${dias} días`);
    sh3.columns = [
      { header: 'Producto',          key: 'producto',          width: 30 },
      { header: 'Lote',              key: 'lote',              width: 16 },
      { header: 'Vencimiento',       key: 'fecha_vencimiento', width: 14 },
      { header: 'Días Restantes',    key: 'dias_restantes',    width: 16 },
      { header: 'Cantidad',          key: 'cantidad',          width: 12 },
      { header: 'Precio Unitario',   key: 'precio_unitario',   width: 16 },
    ];
    sh3.getRow(1).eachCell(estiloEncabezadoExcel);
    sh3.getRow(1).height = 22;
    for (const r of lotes.rows) {
      const row = sh3.addRow({
        producto:          r.producto,
        lote:              r.lote,
        fecha_vencimiento: r.fecha_vencimiento,
        dias_restantes:    Number(r.dias_restantes),
        cantidad:          Number(r.cantidad),
        precio_unitario:   Number(r.precio_unitario),
      });
      row.getCell('precio_unitario').numFmt = '"$"#,##0.00';
      if (Number(r.dias_restantes) <= 7) {
        row.getCell('dias_restantes').font = { bold: true, color: { argb: 'FFDC2626' } };
      }
    }

    const nombre = `Reporte_Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

// ── Compras ────────────────────────────────────────────────────────────────────

/**
 * GET /api/reportes/compras?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 * Resumen del período + listado de órdenes de compra (máx. 500).
 */
export async function getComprasReporte(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const [resumen, detalle] = await Promise.all([
      pool.query<{
        total_ordenes: string; monto_total: string;
        proveedores_unicos: string; productos_lineas: string;
      }>(
        `SELECT
           COUNT(DISTINCT c.id)           AS total_ordenes,
           COALESCE(SUM(c.total), 0)      AS monto_total,
           COUNT(DISTINCT c.proveedor_id) AS proveedores_unicos,
           COUNT(cd.id)                   AS productos_lineas
         FROM compras c
         LEFT JOIN compra_detalle cd ON cd.compra_id = c.id
         WHERE c.tenant_id = $1 AND c.fecha_compra BETWEEN $2 AND $3`,
        [tenantId, inicio, fin],
      ),
      pool.query(
        `SELECT
           c.id,
           c.orden_compra,
           p.nombre           AS proveedor,
           c.fecha_compra::TEXT,
           c.estado,
           c.total,
           COUNT(cd.id)::INT  AS num_lineas
         FROM compras c
         JOIN proveedores p     ON p.id  = c.proveedor_id
         LEFT JOIN compra_detalle cd ON cd.compra_id = c.id
         WHERE c.tenant_id = $1 AND c.fecha_compra BETWEEN $2 AND $3
         GROUP BY c.id, c.orden_compra, p.nombre, c.fecha_compra, c.estado, c.total
         ORDER BY c.fecha_compra DESC, c.id DESC
         LIMIT 500`,
        [tenantId, inicio, fin],
      ),
    ]);

    res.json({
      periodo: { inicio, fin },
      resumen: {
        total_ordenes:      Number(resumen.rows[0].total_ordenes),
        monto_total:        Number(resumen.rows[0].monto_total),
        proveedores_unicos: Number(resumen.rows[0].proveedores_unicos),
        productos_lineas:   Number(resumen.rows[0].productos_lineas),
      },
      compras: detalle.rows.map(r => ({
        id:          r.id,
        orden_compra: r.orden_compra,
        proveedor:   r.proveedor,
        fecha_compra: r.fecha_compra,
        estado:      r.estado,
        total:       Number(r.total),
        num_lineas:  Number(r.num_lineas),
      })),
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/compras/top-proveedores?fecha_inicio=&fecha_fin=
 * Top 10 proveedores por monto total comprado.
 */
export async function getTopProveedores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const { rows } = await pool.query(
      `SELECT
         p.nombre             AS proveedor,
         COUNT(DISTINCT c.id) AS total_ordenes,
         SUM(c.total)         AS total_monto
       FROM compras c
       JOIN proveedores p ON p.id = c.proveedor_id
       WHERE c.tenant_id = $1 AND c.fecha_compra BETWEEN $2 AND $3
       GROUP BY p.id, p.nombre
       ORDER BY total_monto DESC
       LIMIT 10`,
      [tenantId, inicio, fin],
    );

    res.json(rows.map(r => ({
      proveedor:     r.proveedor,
      total_ordenes: Number(r.total_ordenes),
      total_monto:   Number(r.total_monto),
    })));
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/compras/por-estado?fecha_inicio=&fecha_fin=
 * Totales agrupados por estado de la orden de compra.
 */
export async function getComprasPorEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const { rows } = await pool.query(
      `SELECT
         estado,
         COUNT(*) AS total_ordenes,
         SUM(total) AS total_monto
       FROM compras
       WHERE tenant_id = $1 AND fecha_compra BETWEEN $2 AND $3
       GROUP BY estado
       ORDER BY total_monto DESC`,
      [tenantId, inicio, fin],
    );

    res.json(rows.map(r => ({
      estado:        r.estado,
      total_ordenes: Number(r.total_ordenes),
      total_monto:   Number(r.total_monto),
    })));
  } catch (err) { next(err); }
}

/**
 * GET /api/reportes/compras/excel?fecha_inicio=&fecha_fin=
 * Genera y descarga un archivo Excel con el reporte de compras.
 */
export async function getComprasExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId;
    const { inicio, fin } = parseFechas(req.query);

    const [compras, topProveedores, porEstado] = await Promise.all([
      pool.query(
        `SELECT
           c.orden_compra,
           p.nombre          AS proveedor,
           c.fecha_compra::TEXT,
           c.estado,
           c.total,
           COUNT(cd.id)::INT AS num_lineas
         FROM compras c
         JOIN proveedores p     ON p.id  = c.proveedor_id
         LEFT JOIN compra_detalle cd ON cd.compra_id = c.id
         WHERE c.tenant_id = $1 AND c.fecha_compra BETWEEN $2 AND $3
         GROUP BY c.id, c.orden_compra, p.nombre, c.fecha_compra, c.estado, c.total
         ORDER BY c.fecha_compra DESC, c.id DESC`,
        [tenantId, inicio, fin],
      ),
      pool.query(
        `SELECT p.nombre AS proveedor, COUNT(DISTINCT c.id) AS total_ordenes, SUM(c.total) AS total_monto
         FROM compras c JOIN proveedores p ON p.id = c.proveedor_id
         WHERE c.tenant_id = $1 AND c.fecha_compra BETWEEN $2 AND $3
         GROUP BY p.id, p.nombre ORDER BY total_monto DESC LIMIT 10`,
        [tenantId, inicio, fin],
      ),
      pool.query(
        `SELECT estado, COUNT(*) AS total_ordenes, SUM(total) AS total_monto
         FROM compras WHERE tenant_id = $1 AND fecha_compra BETWEEN $2 AND $3
         GROUP BY estado ORDER BY total_monto DESC`,
        [tenantId, inicio, fin],
      ),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ERP DTE Online';
    wb.created = new Date();

    // ── Hoja 1: Órdenes de compra ────────────────────────────────────────────
    const sh1 = wb.addWorksheet('Órdenes de Compra');
    sh1.columns = [
      { header: 'N° Orden',       key: 'orden_compra',  width: 18 },
      { header: 'Proveedor',      key: 'proveedor',     width: 30 },
      { header: 'Fecha',          key: 'fecha_compra',  width: 14 },
      { header: 'Estado',         key: 'estado',        width: 14 },
      { header: 'N° Líneas',      key: 'num_lineas',    width: 12 },
      { header: 'Total',          key: 'total',         width: 16 },
    ];
    sh1.getRow(1).eachCell(estiloEncabezadoExcel);
    sh1.getRow(1).height = 22;
    for (const r of compras.rows) {
      const row = sh1.addRow({
        orden_compra: r.orden_compra,
        proveedor:    r.proveedor,
        fecha_compra: r.fecha_compra,
        estado:       r.estado,
        num_lineas:   Number(r.num_lineas),
        total:        Number(r.total),
      });
      row.getCell('total').numFmt = '"$"#,##0.00';
    }

    // ── Hoja 2: Top proveedores ───────────────────────────────────────────────
    const sh2 = wb.addWorksheet('Top Proveedores');
    sh2.columns = [
      { header: 'Proveedor',    key: 'proveedor',     width: 34 },
      { header: 'N° Órdenes',  key: 'total_ordenes', width: 14 },
      { header: 'Monto Total', key: 'total_monto',   width: 16 },
    ];
    sh2.getRow(1).eachCell(estiloEncabezadoExcel);
    sh2.getRow(1).height = 22;
    for (const r of topProveedores.rows) {
      const row = sh2.addRow({ proveedor: r.proveedor, total_ordenes: Number(r.total_ordenes), total_monto: Number(r.total_monto) });
      row.getCell('total_monto').numFmt = '"$"#,##0.00';
    }

    // ── Hoja 3: Por estado ────────────────────────────────────────────────────
    const sh3 = wb.addWorksheet('Por Estado');
    sh3.columns = [
      { header: 'Estado',      key: 'estado',        width: 16 },
      { header: 'N° Órdenes', key: 'total_ordenes', width: 14 },
      { header: 'Monto Total', key: 'total_monto',  width: 16 },
    ];
    sh3.getRow(1).eachCell(estiloEncabezadoExcel);
    sh3.getRow(1).height = 22;
    for (const r of porEstado.rows) {
      const row = sh3.addRow({ estado: r.estado, total_ordenes: Number(r.total_ordenes), total_monto: Number(r.total_monto) });
      row.getCell('total_monto').numFmt = '"$"#,##0.00';
    }

    const nombre = `Reporte_Compras_${inicio}_${fin}.xlsx`;
    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}
