/**
 * cliente.service.ts — Lógica de negocio y queries SQL para la entidad Cliente.
 * Todas las operaciones filtran por tenantId para garantizar aislamiento multi-tenant.
 */

import { pool } from '../config/database';
import { Cliente, CreateClienteDTO, UpdateClienteDTO } from '../models/cliente.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';

export async function getClientes(
  params: ListQueryParams,
  tenantId: number
): Promise<PaginatedResponse<Cliente>> {
  const { search = '', page = 1, limit = 10 } = params;
  const offset        = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM clientes
       WHERE tenant_id = $1 AND (nombre_completo ILIKE $2 OR numero_documento ILIKE $2)`,
      [tenantId, searchPattern]
    ),
    pool.query<Cliente>(
      `SELECT c.id, c.tipo_cliente, c.nombre_completo, c.tipo_documento,
              c.numero_documento, c.nit, c.ncr, c.nombre_comercial, c.giro,
              c.direccion, c.telefono, c.correo,
              c.departamento_id, c.municipio_id,
              d.nombre AS departamento_nombre,
              m.nombre AS municipio_nombre,
              c.created_at, c.updated_at
       FROM clientes c
       LEFT JOIN cat_departamentos d ON d.id = c.departamento_id
       LEFT JOIN cat_municipios    m ON m.id = c.municipio_id
       WHERE c.tenant_id = $1 AND (c.nombre_completo ILIKE $2 OR c.numero_documento ILIKE $2)
       ORDER BY c.created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, searchPattern, limit, offset]
    ),
  ]);
  const total = parseInt(countResult.rows[0].count, 10);

  return { data: dataResult.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getClienteById(id: number, tenantId: number): Promise<Cliente | null> {
  const result = await pool.query<Cliente>(
    'SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return result.rows[0] ?? null;
}

export async function createCliente(dto: CreateClienteDTO, tenantId: number): Promise<Cliente> {
  const {
    tipo_cliente, nombre_completo, tipo_documento, numero_documento,
    nit, ncr, nombre_comercial, giro,
    direccion, telefono, correo,
    departamento_id, municipio_id,
  } = dto;

  const depId = departamento_id ? Number(departamento_id) : null;
  const munId = municipio_id    ? Number(municipio_id)    : null;

  const result = await pool.query<Cliente>(
    `INSERT INTO clientes
       (tipo_cliente, nombre_completo, tipo_documento, numero_documento,
        nit, ncr, nombre_comercial, giro,
        direccion, telefono, correo, departamento_id, municipio_id, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      tipo_cliente, nombre_completo, tipo_documento, numero_documento,
      nit ?? null, ncr ?? null, nombre_comercial ?? null, giro ?? null,
      direccion ?? null, telefono ?? null, correo ?? null,
      depId, munId, tenantId,
    ]
  );
  return result.rows[0];
}

export async function updateCliente(
  id: number,
  dto: UpdateClienteDTO,
  tenantId: number
): Promise<Cliente | null> {
  if ('departamento_id' in dto) (dto as any).departamento_id = dto.departamento_id ? Number(dto.departamento_id) : null;
  if ('municipio_id'    in dto) (dto as any).municipio_id    = dto.municipio_id    ? Number(dto.municipio_id)    : null;

  const fields = Object.keys(dto) as (keyof UpdateClienteDTO)[];
  if (fields.length === 0) return getClienteById(id, tenantId);

  const setClauses = fields.map((field, i) => `${field} = $${i + 3}`).join(', ');
  const values     = fields.map(f => dto[f] ?? null);

  const result = await pool.query<Cliente>(
    `UPDATE clientes SET ${setClauses} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [id, tenantId, ...values]
  );
  return result.rows[0] ?? null;
}

export async function deleteCliente(id: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM clientes WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
