/**
 * compra.service.ts — Lógica de negocio para Compras.
 * Crea una compra con sus líneas y hace upsert en inventario, todo en transacción.
 */

import { pool } from '../config/database';
import {
  Compra, CompraConDetalle, CreateCompraDTO,
} from '../models/compra.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';
import { AppError } from '../middleware/errorHandler';

/**
 * Fila plana: una línea de compra con el contexto de la cabecera.
 * La tabla principal muestra una fila por cada producto comprado.
 */
export interface CompraLineaRow {
  detalle_id:        number;
  compra_id:         number;
  orden_compra:      string;   // Ej: "OC-0001"
  proveedor_nombre:  string;
  fecha_compra:      string;
  total_compra:      number;
  notas:             string | null;
  producto_nombre:   string;
  cantidad:          number;
  lote:              string | null;
  fecha_vencimiento: string | null;
  precio_unitario:   number;
  subtotal:          number;
}

export async function getCompras(
  params: ListQueryParams,
  tenantId: number
): Promise<PaginatedResponse<CompraLineaRow>> {
  const { search = '', page = 1, limit = 10 } = params;
  const offset        = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const whereClause = `
    WHERE c.tenant_id = $2 AND (p.nombre ILIKE $1 OR pr.nombre ILIKE $1)
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM compra_detalle cd
       JOIN compras c   ON c.id  = cd.compra_id
       JOIN proveedores p ON p.id = c.proveedor_id
       JOIN productos pr  ON pr.id = cd.producto_id
       ${whereClause}`,
      [searchPattern, tenantId]
    ),
    pool.query<CompraLineaRow>(
      `SELECT
         cd.id             AS detalle_id,
         c.id              AS compra_id,
         c.orden_compra,
         p.nombre          AS proveedor_nombre,
         c.fecha_compra,
         c.total           AS total_compra,
         c.notas,
         pr.nombre         AS producto_nombre,
         cd.cantidad,
         cd.lote,
         cd.fecha_vencimiento,
         cd.precio_unitario,
         cd.subtotal
       FROM compra_detalle cd
       JOIN compras c     ON c.id  = cd.compra_id
       JOIN proveedores p ON p.id  = c.proveedor_id
       JOIN productos pr  ON pr.id = cd.producto_id
       ${whereClause}
       ORDER BY c.created_at DESC, cd.id ASC
       LIMIT $3 OFFSET $4`,
      [searchPattern, tenantId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return {
    data:       dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getCompraById(id: number, tenantId: number): Promise<CompraConDetalle | null> {
  const compraResult = await pool.query<Compra & { proveedor_nombre: string }>(
    `SELECT c.id, c.orden_compra, c.proveedor_id, c.fecha_compra,
            c.estado, c.total, c.notas, c.created_at, c.updated_at,
            p.nombre AS proveedor_nombre
     FROM compras c
     JOIN proveedores p ON p.id = c.proveedor_id
     WHERE c.id = $1 AND c.tenant_id = $2`,
    [id, tenantId]
  );
  if (!compraResult.rows[0]) return null;

  const detalleResult = await pool.query<any>(
    `SELECT cd.*, pr.nombre AS producto_nombre
     FROM compra_detalle cd
     JOIN productos pr ON pr.id = cd.producto_id
     WHERE cd.compra_id = $1
     ORDER BY cd.id`,
    [id]
  );

  return {
    ...compraResult.rows[0],
    lineas: detalleResult.rows,
  };
}

export async function createCompra(dto: CreateCompraDTO, tenantId: number): Promise<CompraConDetalle> {
  const { orden_compra, proveedor_id, fecha_compra, notas, lineas } = dto;

  if (!orden_compra?.trim()) {
    throw new AppError('El número de orden de compra es obligatorio', 400);
  }
  if (!lineas || lineas.length === 0) {
    throw new AppError('La compra debe tener al menos una línea de producto', 400);
  }

  // Calcular total
  const total = lineas.reduce((sum, l) => sum + l.cantidad * l.precio_unitario, 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insertar cabecera
    const compraResult = await client.query<Compra>(
      `INSERT INTO compras (orden_compra, proveedor_id, fecha_compra, estado, total, notas, tenant_id)
       VALUES ($1, $2, $3, 'recibida', $4, $5, $6)
       RETURNING *`,
      [orden_compra.trim(), proveedor_id, fecha_compra, total, notas ?? null, tenantId]
    );
    const compra = compraResult.rows[0];

    // 2. Insertar líneas
    for (const linea of lineas) {
      const subtotal = linea.cantidad * linea.precio_unitario;
      await client.query(
        `INSERT INTO compra_detalle
           (compra_id, producto_id, cantidad, lote, fecha_vencimiento, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          compra.id,
          linea.producto_id,
          linea.cantidad,
          linea.lote ?? null,
          linea.fecha_vencimiento ?? null,
          linea.precio_unitario,
          subtotal,
        ]
      );

      // 3. Upsert inventario — manual: busca por (producto_id, lote, tenant_id) con COALESCE para NULLs
      const existente = await client.query<{ id: number }>(
        `SELECT id FROM inventario
         WHERE producto_id = $1
           AND COALESCE(lote, '') = COALESCE($2, '')
           AND tenant_id = $3`,
        [linea.producto_id, linea.lote ?? null, tenantId]
      );

      if (existente.rows.length > 0) {
        await client.query(
          `UPDATE inventario SET
             cantidad          = cantidad + $1,
             precio_unitario   = $2,
             fecha_vencimiento = $3,
             ultima_compra_id  = $4,
             updated_at        = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [
            linea.cantidad,
            linea.precio_unitario,
            linea.fecha_vencimiento ?? null,
            compra.id,
            existente.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO inventario
             (producto_id, lote, fecha_vencimiento, cantidad, precio_unitario, ultima_compra_id, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            linea.producto_id,
            linea.lote ?? null,
            linea.fecha_vencimiento ?? null,
            linea.cantidad,
            linea.precio_unitario,
            compra.id,
            tenantId,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return (await getCompraById(compra.id, tenantId))!;
  } catch (err: any) {
    await client.query('ROLLBACK');
    // Violación de unicidad en orden_compra (código PostgreSQL 23505)
    if (err.code === '23505') {
      throw new AppError(`Ya existe una compra con el número de orden "${orden_compra}"`, 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteCompra(id: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM compras WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
