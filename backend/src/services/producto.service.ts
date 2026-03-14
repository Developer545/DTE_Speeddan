/**
 * producto.service.ts — Lógica de negocio y queries SQL para la entidad Producto.
 * Esta es la ÚNICA capa que conoce SQL. Los controllers llaman métodos de aquí.
 * Filtra por tenant_id para multi-tenancy.
 */

import { pool } from '../config/database';
import { Producto, CreateProductoDTO, UpdateProductoDTO } from '../models/producto.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';

/** SELECT base con JOIN a categorias — reutilizado en todas las queries. */
const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.categoria_id,
         c.nombre AS categoria_nombre,
         p.imagen_url, p.created_at, p.updated_at
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
`;

interface ProductoListParams extends ListQueryParams {
  categoria_id?: number;
}

export async function getProductos(
  params: ProductoListParams,
  tenantId: number
): Promise<PaginatedResponse<Producto>> {
  const { search = '', page = 1, limit = 10, categoria_id } = params;
  const offset        = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  // Construcción dinámica del WHERE para soportar filtro por categoría
  const baseValues: unknown[]  = [tenantId, searchPattern];
  let   extraCond              = '';
  if (categoria_id !== undefined) {
    baseValues.push(categoria_id);
    extraCond = ` AND p.categoria_id = $${baseValues.length}`;
  }

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM productos p
       WHERE p.tenant_id = $1 AND p.nombre ILIKE $2${extraCond}`,
      baseValues
    ),
    pool.query<Producto>(
      `${SELECT_PRODUCTO}
       WHERE p.tenant_id = $1 AND p.nombre ILIKE $2${extraCond}
       ORDER BY p.created_at DESC
       LIMIT $${baseValues.length + 1} OFFSET $${baseValues.length + 2}`,
      [...baseValues, limit, offset]
    ),
  ]);

  return {
    data:       dataResult.rows,
    total:      parseInt(countResult.rows[0].count, 10),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
  };
}

export async function getProductoById(id: number, tenantId: number): Promise<Producto | null> {
  const result = await pool.query<Producto>(
    `${SELECT_PRODUCTO} WHERE p.id = $1 AND p.tenant_id = $2`,
    [id, tenantId]
  );
  return result.rows[0] ?? null;
}

export async function createProducto(
  dto: CreateProductoDTO,
  imagenUrl: string | null,
  tenantId: number
): Promise<Producto> {
  const { nombre, categoria_id } = dto;

  const result = await pool.query<{ id: number }>(
    `INSERT INTO productos (nombre, categoria_id, imagen_url, tenant_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [nombre, categoria_id ?? null, imagenUrl, tenantId]
  );

  return getProductoById(result.rows[0].id, tenantId) as Promise<Producto>;
}

export async function updateProducto(
  id: number,
  dto: UpdateProductoDTO,
  tenantId: number,
  imagenUrl?: string | null
): Promise<Producto | null> {
  const fields = Object.keys(dto) as (keyof UpdateProductoDTO)[];
  const setClauses: string[] = [];
  const values: unknown[]    = [id, tenantId];

  fields.forEach((field, i) => {
    setClauses.push(`${field} = $${i + 3}`);
    values.push(dto[field] ?? null);
  });

  if (imagenUrl !== undefined) {
    setClauses.push(`imagen_url = $${values.length + 1}`);
    values.push(imagenUrl);
  }

  if (setClauses.length === 0) return getProductoById(id, tenantId);

  const result = await pool.query<{ id: number }>(
    `UPDATE productos SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    values
  );

  if (!result.rows[0]) return null;
  return getProductoById(result.rows[0].id, tenantId);
}

export async function deleteProducto(id: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM productos WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
