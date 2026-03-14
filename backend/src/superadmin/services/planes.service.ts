/**
 * planes.service.ts — Lógica de negocio para los Planes de suscripción.
 *
 * Maneja el CRUD de la tabla `planes`.
 */

import { pool }     from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreatePlanDTO, UpdatePlanDTO } from '../models/superadmin.model';

// ═══════════════════════════════════════════════════════════════════════════════
// ── CONSULTAS ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Devuelve todos los planes ordenados por precio ascendente. */
export async function getPlanes() {
  const { rows } = await pool.query(
    `SELECT id, nombre, max_sucursales, max_usuarios, precio, activo
     FROM planes ORDER BY precio ASC`,
  );
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MUTACIONES ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Crea un nuevo plan de suscripción. */
export async function createPlan(dto: CreatePlanDTO) {
  const { rows } = await pool.query(
    `INSERT INTO planes (nombre, max_sucursales, max_usuarios, precio, activo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [dto.nombre, dto.max_sucursales, dto.max_usuarios, dto.precio, dto.activo ?? true],
  );
  return rows[0];
}

/** Actualiza un plan existente. Devuelve null si no existe. */
export async function updatePlan(id: number, dto: UpdatePlanDTO) {
  const { rows } = await pool.query(
    `UPDATE planes SET
       nombre          = COALESCE($2, nombre),
       max_sucursales  = COALESCE($3, max_sucursales),
       max_usuarios    = COALESCE($4, max_usuarios),
       precio          = COALESCE($5, precio),
       activo          = COALESCE($6, activo)
     WHERE id = $1
     RETURNING *`,
    [id, dto.nombre, dto.max_sucursales, dto.max_usuarios, dto.precio, dto.activo],
  );
  if (!rows[0]) throw new AppError('Plan no encontrado', 404);
  return rows[0];
}

/** Elimina un plan por ID. */
export async function deletePlan(id: number): Promise<void> {
  await pool.query(`DELETE FROM planes WHERE id = $1`, [id]);
}
