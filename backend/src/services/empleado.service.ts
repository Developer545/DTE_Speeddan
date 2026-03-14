/**
 * empleado.service.ts — Lógica de negocio y queries SQL para la entidad Empleado.
 * Esta es la ÚNICA capa que conoce SQL. Los controllers llaman métodos de aquí.
 * Filtra por tenant_id para multi-tenancy.
 */

import { pool } from '../config/database';
import { Empleado, CreateEmpleadoDTO, UpdateEmpleadoDTO } from '../models/empleado.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';

export async function getEmpleados(
  params: ListQueryParams,
  tenantId: number
): Promise<PaginatedResponse<Empleado>> {
  const { search = '', page = 1, limit = 10 } = params;
  const offset        = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM empleados
       WHERE tenant_id = $1 AND (nombre_completo ILIKE $2 OR numero_documento ILIKE $2)`,
      [tenantId, searchPattern]
    ),
    pool.query<Empleado>(
      `SELECT e.id, e.nombre_completo, e.tipo_documento, e.numero_documento,
              e.direccion, e.telefono, e.correo,
              e.departamento_id, e.municipio_id,
              d.nombre AS departamento_nombre,
              m.nombre AS municipio_nombre,
              e.created_at, e.updated_at
       FROM empleados e
       LEFT JOIN cat_departamentos d ON d.id = e.departamento_id
       LEFT JOIN cat_municipios    m ON m.id = e.municipio_id
       WHERE e.tenant_id = $1 AND (e.nombre_completo ILIKE $2 OR e.numero_documento ILIKE $2)
       ORDER BY e.created_at DESC
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

export async function getEmpleadoById(id: number, tenantId: number): Promise<Empleado | null> {
  const result = await pool.query<Empleado>(
    `SELECT id, nombre_completo, tipo_documento, numero_documento,
            direccion, telefono, correo,
            departamento_id, municipio_id, created_at, updated_at
     FROM empleados WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return result.rows[0] ?? null;
}

export async function createEmpleado(dto: CreateEmpleadoDTO, tenantId: number): Promise<Empleado> {
  const {
    nombre_completo, tipo_documento, numero_documento,
    direccion, telefono, correo, departamento_id, municipio_id,
  } = dto;

  const depId = departamento_id ? Number(departamento_id) : null;
  const munId = municipio_id    ? Number(municipio_id)    : null;

  const result = await pool.query<Empleado>(
    `INSERT INTO empleados
       (nombre_completo, tipo_documento, numero_documento,
        direccion, telefono, correo, departamento_id, municipio_id, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, nombre_completo, tipo_documento, numero_documento,
               direccion, telefono, correo,
               departamento_id, municipio_id, created_at, updated_at`,
    [
      nombre_completo, tipo_documento, numero_documento,
      direccion ?? null, telefono ?? null, correo ?? null,
      depId, munId, tenantId,
    ]
  );
  return result.rows[0];
}

export async function updateEmpleado(
  id: number,
  dto: UpdateEmpleadoDTO,
  tenantId: number
): Promise<Empleado | null> {
  if ('departamento_id' in dto) (dto as any).departamento_id = dto.departamento_id ? Number(dto.departamento_id) : null;
  if ('municipio_id'    in dto) (dto as any).municipio_id    = dto.municipio_id    ? Number(dto.municipio_id)    : null;

  const fields = Object.keys(dto) as (keyof UpdateEmpleadoDTO)[];
  if (fields.length === 0) return getEmpleadoById(id, tenantId);

  const setClauses = fields.map((field, i) => `${field} = $${i + 3}`).join(', ');
  const values     = fields.map(f => dto[f] ?? null);

  const result = await pool.query<Empleado>(
    `UPDATE empleados SET ${setClauses} WHERE id = $1 AND tenant_id = $2
     RETURNING id, nombre_completo, tipo_documento, numero_documento,
               direccion, telefono, correo, created_at, updated_at`,
    [id, tenantId, ...values]
  );
  return result.rows[0] ?? null;
}

export async function deleteEmpleado(id: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM empleados WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
