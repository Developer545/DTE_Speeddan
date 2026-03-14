/**
 * categoria.service.ts — Lógica de negocio y queries SQL para la entidad Categoria.
 * Esta es la ÚNICA capa que conoce SQL. Los controllers llaman métodos de aquí.
 * Filtra por tenant_id para multi-tenancy.
 */

import { pool } from '../config/database';
import { Categoria, CreateCategoriaDTO, UpdateCategoriaDTO } from '../models/categoria.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';

export async function getCategorias(
  params: ListQueryParams,
  tenantId: number
): Promise<PaginatedResponse<Categoria>> {
  const { search = '', page = 1, limit = 10 } = params;
  const offset        = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM categorias
       WHERE tenant_id = $1 AND nombre ILIKE $2`,
      [tenantId, searchPattern]
    ),
    pool.query<Categoria>(
      `SELECT id, nombre, created_at, updated_at
       FROM categorias
       WHERE tenant_id = $1 AND nombre ILIKE $2
       ORDER BY nombre ASC
       LIMIT $3 OFFSET $4`,
      [tenantId, searchPattern, limit, offset]
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

export async function getCategoriaById(id: number, tenantId: number): Promise<Categoria | null> {
  const result = await pool.query<Categoria>(
    'SELECT id, nombre, created_at, updated_at FROM categorias WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return result.rows[0] ?? null;
}

export async function createCategoria(dto: CreateCategoriaDTO, tenantId: number): Promise<Categoria> {
  const { nombre } = dto;

  const result = await pool.query<Categoria>(
    `INSERT INTO categorias (nombre, tenant_id)
     VALUES ($1, $2)
     RETURNING id, nombre, created_at, updated_at`,
    [nombre, tenantId]
  );
  return result.rows[0];
}

export async function updateCategoria(
  id: number,
  dto: UpdateCategoriaDTO,
  tenantId: number
): Promise<Categoria | null> {
  const fields = Object.keys(dto) as (keyof UpdateCategoriaDTO)[];
  if (fields.length === 0) return getCategoriaById(id, tenantId);

  const setClauses = fields.map((field, i) => `${field} = $${i + 3}`).join(', ');
  const values     = fields.map(f => dto[f] ?? null);

  const result = await pool.query<Categoria>(
    `UPDATE categorias SET ${setClauses} WHERE id = $1 AND tenant_id = $2
     RETURNING id, nombre, created_at, updated_at`,
    [id, tenantId, ...values]
  );
  return result.rows[0] ?? null;
}

export async function deleteCategoria(id: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM categorias WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
