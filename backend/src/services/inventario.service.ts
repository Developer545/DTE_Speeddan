/**
 * inventario.service.ts — Lógica de negocio para Inventario.
 *
 * Funciones originales:
 *   getLotesPorProducto()  — lotes disponibles para el POS
 *   getInventario()        — lista paginada con búsqueda
 *
 * FASE 7A — Inventario avanzado:
 *   crearAjuste()          — ajuste manual (merma/daño/robo/corrección)
 *   getKardex()            — historial completo por producto (UNION de compras, ventas, ajustes)
 *   getAlertasStock()      — productos cuyo stock total < stock_minimo
 */

import { pool } from '../config/database';
import { Inventario } from '../models/inventario.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';
import { AppError } from '../middleware/errorHandler';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface LoteDisponible {
  id:                number;
  lote:              string | null;
  cantidad:          number;
  fecha_vencimiento: string | null;
  precio_unitario:   number;
}

export type TipoAjuste =
  | 'merma'
  | 'dano'
  | 'robo'
  | 'correccion_positiva'
  | 'correccion_negativa';

export interface AjusteDTO {
  inventario_id: number;   // fila exacta de inventario a ajustar
  tipo:          TipoAjuste;
  cantidad:      number;
  motivo:        string;
}

export interface MovimientoKardex {
  id:              number;
  tipo:            string;
  descripcion:     string;
  referencia:      string | null;
  entrada:         number | null;   // cantidad que entra al stock
  salida:          number | null;   // cantidad que sale del stock
  saldo:           number;          // saldo acumulado en ese momento
  precio_unitario: number | null;
  motivo:          string | null;
  fecha:           string;          // ISO timestamp
}

export interface AlertaStock {
  producto_id:   number;
  producto_nombre: string;
  categoria_nombre: string | null;
  stock_actual:  number;
  stock_minimo:  number;
  diferencia:    number;  // stock_minimo - stock_actual (negativo = OK, positivo = alerta)
}

// ── Lectura básica ────────────────────────────────────────────────────────────

/** Lotes con stock > 0 ordenados por vencimiento DESC (NULL = sin vencimiento, primero) */
export async function getLotesPorProducto(
  productoId: number,
  tenantId:   number
): Promise<LoteDisponible[]> {
  const { rows } = await pool.query<LoteDisponible>(
    `SELECT i.id, i.lote, i.cantidad, i.fecha_vencimiento, i.precio_unitario
     FROM inventario i
     WHERE i.producto_id = $1 AND i.tenant_id = $2 AND i.cantidad > 0
     ORDER BY i.fecha_vencimiento DESC NULLS FIRST`,
    [productoId, tenantId]
  );
  return rows;
}

export async function getInventario(
  params:   ListQueryParams,
  tenantId: number
): Promise<PaginatedResponse<Inventario>> {
  const { search = '', page = 1, limit = 10 } = params;
  const offset        = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM inventario i
       JOIN productos pr ON pr.id = i.producto_id
       WHERE i.tenant_id = $1 AND pr.nombre ILIKE $2`,
      [tenantId, searchPattern]
    ),
    pool.query<Inventario>(
      `SELECT i.id, i.producto_id, pr.nombre AS producto_nombre,
              cat.nombre AS categoria_nombre,
              i.lote, i.fecha_vencimiento, i.cantidad,
              i.precio_unitario, i.ultima_compra_id,
              pr.stock_minimo,
              i.created_at, i.updated_at
       FROM inventario i
       JOIN productos pr ON pr.id = i.producto_id
       LEFT JOIN categorias cat ON cat.id = pr.categoria_id
       WHERE i.tenant_id = $1 AND pr.nombre ILIKE $2
       ORDER BY pr.nombre ASC, i.lote ASC NULLS LAST
       LIMIT $3 OFFSET $4`,
      [tenantId, searchPattern, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return { data: dataResult.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ── FASE 7A — Ajustes manuales ────────────────────────────────────────────────

/**
 * Registra un ajuste manual de stock.
 * - Tipos que RESTAN stock: merma, dano, robo, correccion_negativa
 * - Tipos que SUMAN stock:  correccion_positiva
 * Valida que haya suficiente stock antes de restar.
 */
export async function crearAjuste(
  dto:      AjusteDTO,
  tenantId: number,
  usuarioId: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la fila de inventario pertenece al tenant
    const { rows } = await client.query<{ id: number; producto_id: number; cantidad: number }>(
      `SELECT id, producto_id, cantidad
       FROM inventario
       WHERE id = $1 AND tenant_id = $2
       FOR UPDATE`,
      [dto.inventario_id, tenantId]
    );

    if (rows.length === 0) {
      throw new AppError('Registro de inventario no encontrado', 404);
    }

    const lote = rows[0];
    const esResta = ['merma', 'dano', 'robo', 'correccion_negativa'].includes(dto.tipo);

    if (esResta && Number(lote.cantidad) < dto.cantidad) {
      throw new AppError(
        `Stock insuficiente: hay ${lote.cantidad} unidades, se intentan restar ${dto.cantidad}`,
        400
      );
    }

    // Actualizar inventario
    const delta = esResta ? -dto.cantidad : dto.cantidad;
    await client.query(
      `UPDATE inventario SET cantidad = cantidad + $1, updated_at = NOW() WHERE id = $2`,
      [delta, dto.inventario_id]
    );

    // Registrar movimiento
    await client.query(
      `INSERT INTO movimientos_inventario
         (producto_id, inventario_id, tipo, cantidad, motivo, usuario_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [lote.producto_id, dto.inventario_id, dto.tipo, dto.cantidad, dto.motivo || null, usuarioId, tenantId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── FASE 7A — Kardex ──────────────────────────────────────────────────────────

/**
 * Kardex completo de un producto.
 * Combina: entradas (compras), salidas (ventas), devoluciones, ajustes manuales.
 * Calcula el saldo acumulado cronológicamente y lo devuelve en orden DESC.
 */
export async function getKardex(
  productoId: number,
  tenantId:   number
): Promise<MovimientoKardex[]> {
  const { rows } = await pool.query<{
    id: number; tipo: string; descripcion: string; referencia: string | null;
    es_entrada: boolean; cantidad: number; precio_unitario: number | null;
    motivo: string | null; fecha: string; saldo: number;
  }>(
    `WITH movimientos AS (
       -- Entradas por compra
       SELECT
         cd.id,
         'entrada'              AS tipo,
         'Compra'               AS descripcion,
         c.orden_compra         AS referencia,
         true                   AS es_entrada,
         cd.cantidad::float     AS cantidad,
         cd.precio_unitario::float AS precio_unitario,
         NULL::text             AS motivo,
         c.fecha_compra::timestamp AS fecha
       FROM compra_detalle cd
       JOIN compras c ON c.id = cd.compra_id
       WHERE cd.producto_id = $1
         AND c.tenant_id    = $2
         AND c.estado       != 'cancelada'

       UNION ALL

       -- Salidas por factura (excluye notas de crédito y facturas canceladas)
       SELECT
         fd.id,
         'salida'              AS tipo,
         CASE f.tipo_dte
           WHEN 'DTE_01' THEN 'Venta C.F.'
           WHEN 'DTE_03' THEN 'Venta CCF'
           ELSE f.tipo_dte
         END                   AS descripcion,
         f.numero_dte          AS referencia,
         false                 AS es_entrada,
         fd.cantidad::float    AS cantidad,
         fd.precio_unitario::float AS precio_unitario,
         NULL::text            AS motivo,
         f.fecha_emision::timestamp AS fecha
       FROM factura_detalles fd
       JOIN facturas f ON f.id = fd.factura_id
       WHERE fd.producto_id = $1
         AND f.tenant_id    = $2
         AND f.estado       != 'cancelado'
         AND f.tipo_dte     != 'DTE_06'

       UNION ALL

       -- Devoluciones DTE_06 (reingreso de stock)
       SELECT
         fd.id,
         'devolucion'          AS tipo,
         'Devolución NC'       AS descripcion,
         f.numero_dte          AS referencia,
         true                  AS es_entrada,
         fd.cantidad::float    AS cantidad,
         fd.precio_unitario::float AS precio_unitario,
         NULL::text            AS motivo,
         f.fecha_emision::timestamp AS fecha
       FROM factura_detalles fd
       JOIN facturas f ON f.id = fd.factura_id
       WHERE fd.producto_id = $1
         AND f.tenant_id    = $2
         AND f.tipo_dte     = 'DTE_06'

       UNION ALL

       -- Ajustes manuales
       SELECT
         mi.id,
         mi.tipo               AS tipo,
         CASE mi.tipo
           WHEN 'merma'              THEN 'Merma'
           WHEN 'dano'               THEN 'Daño'
           WHEN 'robo'               THEN 'Robo'
           WHEN 'correccion_positiva' THEN 'Corrección +'
           WHEN 'correccion_negativa' THEN 'Corrección –'
           ELSE mi.tipo
         END                   AS descripcion,
         NULL::text            AS referencia,
         (mi.tipo = 'correccion_positiva') AS es_entrada,
         mi.cantidad::float    AS cantidad,
         NULL::float           AS precio_unitario,
         mi.motivo             AS motivo,
         mi.created_at         AS fecha
       FROM movimientos_inventario mi
       WHERE mi.producto_id = $1
         AND mi.tenant_id   = $2
     ),
     con_saldo AS (
       SELECT *,
         SUM(CASE WHEN es_entrada THEN cantidad ELSE -cantidad END)
           OVER (ORDER BY fecha ASC, id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
           AS saldo
       FROM movimientos
     )
     SELECT * FROM con_saldo ORDER BY fecha DESC, id DESC`,
    [productoId, tenantId]
  );

  return rows.map(r => ({
    id:              r.id,
    tipo:            r.tipo,
    descripcion:     r.descripcion,
    referencia:      r.referencia,
    entrada:         r.es_entrada ? r.cantidad : null,
    salida:          r.es_entrada ? null : r.cantidad,
    saldo:           r.saldo,
    precio_unitario: r.precio_unitario,
    motivo:          r.motivo,
    fecha:           r.fecha,
  }));
}

// ── FASE 7A — Alertas de stock ────────────────────────────────────────────────

/**
 * Devuelve productos cuyo stock total (suma de lotes) es inferior a su stock_minimo.
 * Solo incluye productos con stock_minimo > 0.
 */
export async function getAlertasStock(tenantId: number): Promise<AlertaStock[]> {
  const { rows } = await pool.query<AlertaStock>(
    `SELECT
       pr.id                                AS producto_id,
       pr.nombre                            AS producto_nombre,
       cat.nombre                           AS categoria_nombre,
       COALESCE(SUM(i.cantidad), 0)::float  AS stock_actual,
       pr.stock_minimo::float               AS stock_minimo,
       (pr.stock_minimo - COALESCE(SUM(i.cantidad), 0))::float AS diferencia
     FROM productos pr
     LEFT JOIN inventario i   ON i.producto_id = pr.id AND i.tenant_id = $1
     LEFT JOIN categorias cat ON cat.id = pr.categoria_id
     WHERE pr.stock_minimo > 0
       AND pr.tenant_id = $1
     GROUP BY pr.id, pr.nombre, pr.stock_minimo, cat.nombre
     HAVING COALESCE(SUM(i.cantidad), 0) < pr.stock_minimo
     ORDER BY diferencia DESC`,
    [tenantId]
  );
  return rows;
}
