/**
 * proveedor.service.ts — Lógica de negocio y queries SQL para Proveedor.
 * Misma estructura que cliente.service.ts.
 * Busca por nombre o nit. Filtra por tenant_id.
 */

import { pool } from '../config/database';
import { Proveedor, CreateProveedorDTO, UpdateProveedorDTO } from '../models/proveedor.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';

export async function getProveedores(
  params: ListQueryParams,
  tenantId: number
): Promise<PaginatedResponse<Proveedor>> {
  const { search = '', page = 1, limit = 10 } = params;
  const offset        = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM proveedores
       WHERE tenant_id = $1 AND (nombre ILIKE $2 OR nit ILIKE $2)`,
      [tenantId, searchPattern]
    ),
    pool.query<Proveedor>(
      `SELECT p.id, p.nombre, p.nit, p.ncr, p.direccion, p.telefono, p.correo,
              p.departamento_id, p.municipio_id,
              d.nombre AS departamento_nombre,
              m.nombre AS municipio_nombre,
              p.created_at, p.updated_at
       FROM proveedores p
       LEFT JOIN cat_departamentos d ON d.id = p.departamento_id
       LEFT JOIN cat_municipios    m ON m.id = p.municipio_id
       WHERE p.tenant_id = $1 AND (p.nombre ILIKE $2 OR p.nit ILIKE $2)
       ORDER BY p.created_at DESC
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

export async function getProveedorById(id: number, tenantId: number): Promise<Proveedor | null> {
  const result = await pool.query<Proveedor>(
    'SELECT * FROM proveedores WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return result.rows[0] ?? null;
}

export async function createProveedor(dto: CreateProveedorDTO, tenantId: number): Promise<Proveedor> {
  const { nombre, nit, ncr, direccion, telefono, correo, departamento_id, municipio_id } = dto;

  const depId = departamento_id ? Number(departamento_id) : null;
  const munId = municipio_id    ? Number(municipio_id)    : null;

  const result = await pool.query<Proveedor>(
    `INSERT INTO proveedores
       (nombre, nit, ncr, direccion, telefono, correo, departamento_id, municipio_id, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      nombre, nit ?? null, ncr ?? null, direccion ?? null,
      telefono ?? null, correo ?? null,
      depId, munId, tenantId,
    ]
  );
  return result.rows[0];
}

export async function updateProveedor(
  id: number,
  dto: UpdateProveedorDTO,
  tenantId: number
): Promise<Proveedor | null> {
  if ('departamento_id' in dto) (dto as any).departamento_id = dto.departamento_id ? Number(dto.departamento_id) : null;
  if ('municipio_id'    in dto) (dto as any).municipio_id    = dto.municipio_id    ? Number(dto.municipio_id)    : null;

  const fields = Object.keys(dto) as (keyof UpdateProveedorDTO)[];
  if (fields.length === 0) return getProveedorById(id, tenantId);

  const setClauses = fields.map((field, i) => `${field} = $${i + 3}`).join(', ');
  const values     = fields.map(f => dto[f] ?? null);

  const result = await pool.query<Proveedor>(
    `UPDATE proveedores SET ${setClauses} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [id, tenantId, ...values]
  );
  return result.rows[0] ?? null;
}

export async function deleteProveedor(id: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM proveedores WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
