/**
 * catalog.service.ts — CRUD para CAT-012 Departamentos y CAT-013 Municipios.
 */

import { pool } from '../config/database';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Departamento {
  id:     number;
  codigo: string;
  nombre: string;
}

export interface Municipio {
  id:               number;
  codigo:           string;
  nombre:           string;
  departamento_id:  number;
  departamento_nombre?: string;
}

// ── Departamentos ──────────────────────────────────────────────────────────────

export async function getDepartamentos(): Promise<Departamento[]> {
  const { rows } = await pool.query(
    `SELECT * FROM cat_departamentos ORDER BY codigo`
  );
  return rows;
}

export async function createDepartamento(codigo: string, nombre: string): Promise<Departamento> {
  const { rows } = await pool.query(
    `INSERT INTO cat_departamentos (codigo, nombre) VALUES ($1, $2) RETURNING *`,
    [codigo.trim(), nombre.trim()]
  );
  return rows[0];
}

export async function updateDepartamento(id: number, codigo: string, nombre: string): Promise<Departamento> {
  const { rows } = await pool.query(
    `UPDATE cat_departamentos SET codigo = $1, nombre = $2 WHERE id = $3 RETURNING *`,
    [codigo.trim(), nombre.trim(), id]
  );
  return rows[0];
}

export async function deleteDepartamento(id: number): Promise<void> {
  await pool.query(`DELETE FROM cat_departamentos WHERE id = $1`, [id]);
}

// ── Municipios ─────────────────────────────────────────────────────────────────

export async function getMunicipios(departamentoId?: number): Promise<Municipio[]> {
  const base = `
    SELECT m.*, d.nombre AS departamento_nombre
    FROM cat_municipios m
    JOIN cat_departamentos d ON d.id = m.departamento_id
  `;
  if (departamentoId) {
    const { rows } = await pool.query(
      `${base} WHERE m.departamento_id = $1 ORDER BY m.codigo`,
      [departamentoId]
    );
    return rows;
  }
  const { rows } = await pool.query(`${base} ORDER BY d.codigo, m.codigo`);
  return rows;
}

export async function createMunicipio(
  codigo: string, nombre: string, departamentoId: number
): Promise<Municipio> {
  const { rows } = await pool.query(
    `INSERT INTO cat_municipios (codigo, nombre, departamento_id) VALUES ($1, $2, $3) RETURNING *`,
    [codigo.trim(), nombre.trim(), departamentoId]
  );
  return rows[0];
}

export async function updateMunicipio(
  id: number, codigo: string, nombre: string, departamentoId: number
): Promise<Municipio> {
  const { rows } = await pool.query(
    `UPDATE cat_municipios SET codigo = $1, nombre = $2, departamento_id = $3 WHERE id = $4 RETURNING *`,
    [codigo.trim(), nombre.trim(), departamentoId, id]
  );
  return rows[0];
}

export async function deleteMunicipio(id: number): Promise<void> {
  await pool.query(`DELETE FROM cat_municipios WHERE id = $1`, [id]);
}
