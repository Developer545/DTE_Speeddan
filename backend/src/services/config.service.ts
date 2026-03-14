/**
 * config.service.ts — Lógica de negocio para Configuración del sistema.
 *   - Empresa (por tenant)
 *   - Tema (por tenant)
 *   - DTE correlativos (por tenant via puntos_venta)
 *   - Usuarios (por tenant)
 *   - Sucursales (por tenant)
 *   - Puntos de Venta (por tenant)
 *   - API Hacienda (lectura desde tenant_api_mh — solo superadmin puede escribir)
 *   - Firma Digital (lectura desde tenant_firma — solo superadmin puede escribir)
 */

import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  ConfigEmpresa, UpdateEmpresaDTO,
  ConfigTema,    UpdateTemaDTO,
  DTEConfig,
  Usuario,       CreateUsuarioDTO, UpdateUsuarioDTO,
  Sucursal,      CreateSucursalDTO,
  PuntoVenta,    CreatePuntoVentaDTO,
  ConfigAPIMH,
  ConfigFirma,
} from '../models/config.model';

const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────────────────────────────────────
// EMPRESA
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmpresa(tenantId: number): Promise<ConfigEmpresa> {
  const result = await pool.query<ConfigEmpresa>(
    `SELECT * FROM configuracion_empresa WHERE tenant_id = $1`,
    [tenantId]
  );
  return result.rows[0];
}

export async function updateEmpresa(dto: UpdateEmpresaDTO, tenantId: number): Promise<ConfigEmpresa> {
  const result = await pool.query<ConfigEmpresa>(
    `INSERT INTO configuracion_empresa
       (tenant_id, nombre_negocio, nit, ncr, direccion, giro, departamento, municipio,
        departamento_id, municipio_id,
        telefono, correo, cod_actividad, desc_actividad, tipo_establecimiento, updated_at)
     VALUES ($15, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
     ON CONFLICT (tenant_id) DO UPDATE SET
       nombre_negocio       = EXCLUDED.nombre_negocio,
       nit                  = EXCLUDED.nit,
       ncr                  = EXCLUDED.ncr,
       direccion            = EXCLUDED.direccion,
       giro                 = EXCLUDED.giro,
       departamento         = EXCLUDED.departamento,
       municipio            = EXCLUDED.municipio,
       departamento_id      = EXCLUDED.departamento_id,
       municipio_id         = EXCLUDED.municipio_id,
       telefono             = EXCLUDED.telefono,
       correo               = EXCLUDED.correo,
       cod_actividad        = EXCLUDED.cod_actividad,
       desc_actividad       = EXCLUDED.desc_actividad,
       tipo_establecimiento = EXCLUDED.tipo_establecimiento,
       updated_at           = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      dto.nombre_negocio,
      dto.nit           ?? null, dto.ncr               ?? null,
      dto.direccion     ?? null, dto.giro               ?? null,
      dto.departamento  ?? null, dto.municipio          ?? null,
      dto.departamento_id ?? null, dto.municipio_id     ?? null,
      dto.telefono      ?? null, dto.correo             ?? null,
      dto.cod_actividad ?? null, dto.desc_actividad     ?? null,
      dto.tipo_establecimiento ?? null,
      tenantId,
    ]
  );
  return result.rows[0];
}

export async function updateEmpresaLogo(logoUrl: string, tenantId: number): Promise<ConfigEmpresa> {
  const result = await pool.query<ConfigEmpresa>(
    `UPDATE configuracion_empresa
     SET logo_url = $1, updated_at = CURRENT_TIMESTAMP
     WHERE tenant_id = $2
     RETURNING *`,
    [logoUrl, tenantId]
  );
  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMA
// ─────────────────────────────────────────────────────────────────────────────

export async function getTema(tenantId: number): Promise<ConfigTema> {
  const result = await pool.query<ConfigTema>(
    `SELECT * FROM configuracion_tema WHERE tenant_id = $1`,
    [tenantId]
  );
  return result.rows[0];
}

export async function updateTema(dto: UpdateTemaDTO, tenantId: number): Promise<ConfigTema> {
  const campos: string[] = [];
  const valores: any[]   = [];
  let idx = 1;

  if (dto.accent      !== undefined) { campos.push(`accent = $${idx++}`);      valores.push(dto.accent); }
  if (dto.accent_text !== undefined) { campos.push(`accent_text = $${idx++}`); valores.push(dto.accent_text); }
  if (dto.page_bg     !== undefined) { campos.push(`page_bg = $${idx++}`);     valores.push(dto.page_bg); }
  if (dto.card_bg     !== undefined) { campos.push(`card_bg = $${idx++}`);     valores.push(dto.card_bg); }
  if (dto.sidebar_bg  !== undefined) { campos.push(`sidebar_bg = $${idx++}`);  valores.push(dto.sidebar_bg); }
  if (dto.glass_blur  !== undefined) { campos.push(`glass_blur = $${idx++}`);  valores.push(dto.glass_blur); }

  if (campos.length === 0) return getTema(tenantId);

  campos.push(`updated_at = CURRENT_TIMESTAMP`);
  valores.push(tenantId);

  const result = await pool.query<ConfigTema>(
    `UPDATE configuracion_tema SET ${campos.join(', ')} WHERE tenant_id = $${idx} RETURNING *`,
    valores
  );
  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// DTE CORRELATIVOS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDTEConfigs(tenantId: number): Promise<DTEConfig[]> {
  const result = await pool.query<DTEConfig>(
    `SELECT nd.id, nd.tipo_dte, nd.prefijo, nd.numero_actual, nd.updated_at
     FROM numeros_dte nd
     JOIN puntos_venta pv ON pv.id = nd.punto_venta_id
     JOIN sucursales s    ON s.id  = pv.sucursal_id
     WHERE s.tenant_id = $1
     ORDER BY nd.tipo_dte ASC`,
    [tenantId]
  );
  return result.rows;
}

export async function updateDTEConfig(
  tipoDTE: string,
  dto: { prefijo?: string; numero_actual?: number },
  tenantId: number
): Promise<DTEConfig> {
  const campos: string[] = [];
  const valores: any[]   = [];
  let idx = 1;

  if (dto.prefijo       !== undefined) { campos.push(`nd.prefijo = $${idx++}`);       valores.push(dto.prefijo); }
  if (dto.numero_actual !== undefined) { campos.push(`nd.numero_actual = $${idx++}`); valores.push(dto.numero_actual); }

  if (campos.length === 0) {
    const r = await pool.query<DTEConfig>(
      `SELECT nd.* FROM numeros_dte nd
       JOIN puntos_venta pv ON pv.id = nd.punto_venta_id
       JOIN sucursales s    ON s.id  = pv.sucursal_id
       WHERE nd.tipo_dte = $1 AND s.tenant_id = $2`,
      [tipoDTE, tenantId]
    );
    return r.rows[0];
  }

  // UPDATE con JOIN usando subquery para seguridad
  const setClause = campos.map(c => c.replace('nd.', '')).join(', ');
  const updateValores = [...valores, tipoDTE, tenantId];
  const result = await pool.query<DTEConfig>(
    `UPDATE numeros_dte nd
     SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     FROM puntos_venta pv, sucursales s
     WHERE nd.punto_venta_id = pv.id
       AND pv.sucursal_id = s.id
       AND nd.tipo_dte = $${idx}
       AND s.tenant_id = $${idx + 1}
     RETURNING nd.*`,
    updateValores
  );
  if (result.rows.length === 0) throw new AppError('Tipo DTE no encontrado', 404);
  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────────────────────────────────────────

export async function getUsuarios(tenantId: number): Promise<Usuario[]> {
  const result = await pool.query<Usuario>(
    `SELECT id, nombre, username, rol, activo, created_at, updated_at
     FROM usuarios WHERE tenant_id = $1 ORDER BY id ASC`,
    [tenantId]
  );
  return result.rows;
}

export async function getUsuarioById(id: number, tenantId: number): Promise<Usuario | null> {
  const result = await pool.query<Usuario>(
    `SELECT id, nombre, username, rol, activo, created_at, updated_at
     FROM usuarios WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return result.rows[0] ?? null;
}

export async function createUsuario(dto: CreateUsuarioDTO, tenantId: number): Promise<Usuario> {
  const exists = await pool.query(
    `SELECT id FROM usuarios WHERE username = $1 AND tenant_id = $2`,
    [dto.username, tenantId]
  );
  if (exists.rows.length > 0) throw new AppError('El username ya está en uso', 409);

  const hash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const result = await pool.query<Usuario>(
    `INSERT INTO usuarios (nombre, username, password_hash, rol, tenant_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nombre, username, rol, activo, created_at, updated_at`,
    [dto.nombre, dto.username, hash, dto.rol, tenantId]
  );
  return result.rows[0];
}

export async function updateUsuario(id: number, dto: UpdateUsuarioDTO, tenantId: number): Promise<Usuario> {
  const campos: string[] = [];
  const valores: any[]   = [];
  let idx = 1;

  if (dto.nombre   !== undefined) { campos.push(`nombre = $${idx++}`);   valores.push(dto.nombre); }
  if (dto.username !== undefined) {
    const exists = await pool.query(
      `SELECT id FROM usuarios WHERE username = $1 AND id != $2 AND tenant_id = $3`,
      [dto.username, id, tenantId]
    );
    if (exists.rows.length > 0) throw new AppError('El username ya está en uso', 409);
    campos.push(`username = $${idx++}`); valores.push(dto.username);
  }
  if (dto.password !== undefined) {
    const hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    campos.push(`password_hash = $${idx++}`); valores.push(hash);
  }
  if (dto.rol    !== undefined) { campos.push(`rol = $${idx++}`);    valores.push(dto.rol); }
  if (dto.activo !== undefined) { campos.push(`activo = $${idx++}`); valores.push(dto.activo); }

  if (campos.length === 0) {
    const u = await getUsuarioById(id, tenantId);
    if (!u) throw new AppError('Usuario no encontrado', 404);
    return u;
  }

  campos.push(`updated_at = CURRENT_TIMESTAMP`);
  valores.push(id);
  valores.push(tenantId);

  const result = await pool.query<Usuario>(
    `UPDATE usuarios SET ${campos.join(', ')}
     WHERE id = $${idx} AND tenant_id = $${idx + 1}
     RETURNING id, nombre, username, rol, activo, created_at, updated_at`,
    valores
  );
  if (result.rows.length === 0) throw new AppError('Usuario no encontrado', 404);
  return result.rows[0];
}

export async function deleteUsuario(id: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM usuarios WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUCURSALES
// ─────────────────────────────────────────────────────────────────────────────

export async function getSucursales(tenantId: number): Promise<Sucursal[]> {
  const result = await pool.query<Sucursal>(`
    SELECT
      s.*,
      cd.nombre AS departamento_nombre,
      cm.nombre AS municipio_nombre
    FROM sucursales s
    LEFT JOIN cat_departamentos cd ON cd.id = s.departamento_id
    LEFT JOIN cat_municipios    cm ON cm.id = s.municipio_id
    WHERE s.tenant_id = $1
    ORDER BY s.codigo ASC
  `, [tenantId]);
  return result.rows;
}

export async function createSucursal(dto: CreateSucursalDTO, tenantId: number): Promise<Sucursal> {
  const exists = await pool.query(
    `SELECT id FROM sucursales WHERE codigo = $1 AND tenant_id = $2`,
    [dto.codigo, tenantId]
  );
  if (exists.rows.length > 0) throw new AppError('Ya existe una sucursal con ese código', 409);
  const result = await pool.query<Sucursal>(
    `INSERT INTO sucursales (nombre, codigo, codigo_mh, direccion, departamento_id, municipio_id, telefono, correo, activo, tenant_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [dto.nombre, dto.codigo.toUpperCase(), dto.codigo_mh||null, dto.direccion||null,
     dto.departamento_id||null, dto.municipio_id||null, dto.telefono||null, dto.correo||null,
     dto.activo ?? true, tenantId]
  );
  return result.rows[0];
}

export async function updateSucursal(id: number, dto: Partial<CreateSucursalDTO>, tenantId: number): Promise<Sucursal> {
  const campos: string[] = [];
  const valores: any[]   = [];
  let idx = 1;
  if (dto.nombre          !== undefined) { campos.push(`nombre=$${idx++}`);          valores.push(dto.nombre); }
  if (dto.codigo          !== undefined) { campos.push(`codigo=$${idx++}`);          valores.push(dto.codigo.toUpperCase()); }
  if (dto.codigo_mh       !== undefined) { campos.push(`codigo_mh=$${idx++}`);       valores.push(dto.codigo_mh||null); }
  if (dto.direccion       !== undefined) { campos.push(`direccion=$${idx++}`);       valores.push(dto.direccion||null); }
  if (dto.departamento_id !== undefined) { campos.push(`departamento_id=$${idx++}`); valores.push(dto.departamento_id||null); }
  if (dto.municipio_id    !== undefined) { campos.push(`municipio_id=$${idx++}`);    valores.push(dto.municipio_id||null); }
  if (dto.telefono        !== undefined) { campos.push(`telefono=$${idx++}`);        valores.push(dto.telefono||null); }
  if (dto.correo          !== undefined) { campos.push(`correo=$${idx++}`);          valores.push(dto.correo||null); }
  if (dto.activo          !== undefined) { campos.push(`activo=$${idx++}`);          valores.push(dto.activo); }
  if (campos.length === 0) throw new AppError('Sin cambios', 400);
  campos.push(`updated_at=CURRENT_TIMESTAMP`);
  valores.push(id);
  valores.push(tenantId);
  const result = await pool.query<Sucursal>(
    `UPDATE sucursales SET ${campos.join(',')}
     WHERE id=$${idx} AND tenant_id=$${idx + 1} RETURNING *`,
    valores
  );
  if (result.rows.length === 0) throw new AppError('Sucursal no encontrada', 404);
  return result.rows[0];
}

export async function deleteSucursal(id: number, tenantId: number): Promise<boolean> {
  // No permitir eliminar si es la única sucursal del tenant
  const count = await pool.query(`SELECT COUNT(*) FROM sucursales WHERE tenant_id = $1`, [tenantId]);
  if (parseInt(count.rows[0].count) <= 1) {
    throw new AppError('No se puede eliminar la única sucursal', 400);
  }
  const result = await pool.query(
    `DELETE FROM sucursales WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUNTOS DE VENTA
// ─────────────────────────────────────────────────────────────────────────────

export async function getPuntosVentaBySucursal(sucursalId: number, tenantId: number): Promise<PuntoVenta[]> {
  const result = await pool.query<PuntoVenta>(`
    SELECT pv.*, s.nombre AS sucursal_nombre,
           s.codigo || pv.codigo AS prefijo
    FROM puntos_venta pv
    JOIN sucursales s ON s.id = pv.sucursal_id
    WHERE pv.sucursal_id = $1 AND s.tenant_id = $2
    ORDER BY pv.codigo ASC
  `, [sucursalId, tenantId]);
  return result.rows;
}

export async function getAllPuntosVenta(tenantId: number): Promise<PuntoVenta[]> {
  const result = await pool.query<PuntoVenta>(`
    SELECT pv.*, s.nombre AS sucursal_nombre,
           s.codigo || pv.codigo AS prefijo
    FROM puntos_venta pv
    JOIN sucursales s ON s.id = pv.sucursal_id
    WHERE s.tenant_id = $1
    ORDER BY s.codigo, pv.codigo ASC
  `, [tenantId]);
  return result.rows;
}

export async function createPuntoVenta(dto: CreatePuntoVentaDTO, tenantId: number): Promise<PuntoVenta> {
  // Verificar que la sucursal pertenece al tenant
  const suc = await pool.query(
    `SELECT id, codigo FROM sucursales WHERE id=$1 AND tenant_id=$2`,
    [dto.sucursal_id, tenantId]
  );
  if (suc.rows.length === 0) throw new AppError('Sucursal no encontrada', 404);

  const result = await pool.query<PuntoVenta>(
    `INSERT INTO puntos_venta (sucursal_id, nombre, codigo, codigo_mh, activo)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [dto.sucursal_id, dto.nombre, dto.codigo.toUpperCase(), dto.codigo_mh||null, dto.activo ?? true]
  );
  const prefijo = suc.rows[0].codigo + result.rows[0].codigo;
  const pvId    = result.rows[0].id;
  await pool.query(`
    INSERT INTO numeros_dte (tipo_dte, numero_actual, prefijo, punto_venta_id)
    VALUES
      ('DTE_01',0,$1,$2),('DTE_03',0,$1,$2),('DTE_05',0,$1,$2),('DTE_06',0,$1,$2),('DTE_11',0,$1,$2)
    ON CONFLICT DO NOTHING
  `, [prefijo, pvId]);
  return result.rows[0];
}

export async function updatePuntoVenta(id: number, dto: Partial<CreatePuntoVentaDTO>, tenantId: number): Promise<PuntoVenta> {
  const campos: string[] = [];
  const valores: any[]   = [];
  let idx = 1;
  if (dto.nombre    !== undefined) { campos.push(`pv.nombre=$${idx++}`);    valores.push(dto.nombre); }
  if (dto.codigo    !== undefined) { campos.push(`pv.codigo=$${idx++}`);    valores.push(dto.codigo.toUpperCase()); }
  if (dto.codigo_mh !== undefined) { campos.push(`pv.codigo_mh=$${idx++}`); valores.push(dto.codigo_mh||null); }
  if (dto.activo    !== undefined) { campos.push(`pv.activo=$${idx++}`);    valores.push(dto.activo); }
  if (campos.length === 0) throw new AppError('Sin cambios', 400);

  // Normalizar el set clause (quitar el alias pv.)
  const setClause = campos.map(c => c.replace('pv.', '')).join(',');
  valores.push(id);
  valores.push(tenantId);

  const result = await pool.query<PuntoVenta>(`
    UPDATE puntos_venta pv
    SET ${setClause}, updated_at=CURRENT_TIMESTAMP
    FROM sucursales s
    WHERE pv.sucursal_id = s.id
      AND pv.id = $${idx}
      AND s.tenant_id = $${idx + 1}
    RETURNING pv.*
  `, valores);
  if (result.rows.length === 0) throw new AppError('Punto de venta no encontrado', 404);
  return result.rows[0];
}

export async function deletePuntoVenta(id: number, tenantId: number): Promise<boolean> {
  // Verificar que el punto de venta pertenece al tenant via sucursal
  const result = await pool.query(`
    DELETE FROM puntos_venta pv
    USING sucursales s
    WHERE pv.sucursal_id = s.id
      AND pv.id = $1
      AND s.tenant_id = $2
  `, [id, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// API HACIENDA — solo lectura para tenant (superadmin gestiona credenciales)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAPIMH(tenantId: number): Promise<Omit<ConfigAPIMH, 'password_api' | 'token_activo'> & { tiene_password: boolean }> {
  const result = await pool.query(
    `SELECT id, ambiente, url_auth, url_transmision, usuario_api,
            (password_api IS NOT NULL AND password_api <> '') AS tiene_password,
            token_activo IS NOT NULL AS tiene_token,
            token_expira_en, updated_at
     FROM tenant_api_mh WHERE tenant_id = $1`,
    [tenantId]
  );
  return result.rows[0];
}

/**
 * updateAPIMH — Actualiza configuración de API Hacienda del tenant.
 * Acepta actualización parcial: solo los campos provistos se modifican.
 */
export async function updateAPIMH(
  tenantId: number,
  dto: { ambiente?: string; url_auth?: string; url_transmision?: string; usuario_api?: string; password_api?: string },
): Promise<void> {
  const { encrypt } = await import('../utils/crypto');
  const sets: string[] = [];
  const params: (string | number | null)[] = [tenantId];
  let idx = 2;

  if (dto.ambiente        !== undefined) { sets.push(`ambiente        = $${idx++}`); params.push(dto.ambiente); }
  if (dto.url_auth        !== undefined) { sets.push(`url_auth        = $${idx++}`); params.push(dto.url_auth); }
  if (dto.url_transmision !== undefined) { sets.push(`url_transmision = $${idx++}`); params.push(dto.url_transmision); }
  if (dto.usuario_api     !== undefined) { sets.push(`usuario_api     = $${idx++}`); params.push(dto.usuario_api); }
  if (dto.password_api) {
    sets.push(`password_api = $${idx++}`);
    params.push(encrypt(dto.password_api));
  }
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  await pool.query(
    `UPDATE tenant_api_mh SET ${sets.join(', ')} WHERE tenant_id = $1`,
    params,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRMA ELECTRÓNICA — solo lectura para tenant (superadmin gestiona la firma)
// ─────────────────────────────────────────────────────────────────────────────

export async function getFirma(tenantId: number): Promise<{ tiene_certificado: boolean; tiene_password: boolean; nit_certificado: string | null; fecha_vencimiento: string | null; updated_at: string }> {
  const result = await pool.query(
    `SELECT (archivo_nombre IS NOT NULL)                              AS tiene_certificado,
            (certificado_pass IS NOT NULL AND certificado_pass <> '') AS tiene_password,
            nit_certificado, fecha_vencimiento, updated_at
     FROM tenant_firma WHERE tenant_id = $1`,
    [tenantId],
  );
  return result.rows[0];
}

/**
 * Guarda el archivo .p12/.pfx subido por el cliente en disco y actualiza la BD.
 * No expone la ruta al frontend.
 */
export async function uploadFirmaCertificado(
  tenantId: number,
  archivoNombre: string,
  certificadoPath: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO tenant_firma (tenant_id, archivo_nombre, certificado_path)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id) DO UPDATE
       SET archivo_nombre   = EXCLUDED.archivo_nombre,
           certificado_path = EXCLUDED.certificado_path,
           updated_at       = CURRENT_TIMESTAMP`,
    [tenantId, archivoNombre, certificadoPath],
  );
}

/**
 * Actualiza metadatos de la firma: contraseña, NIT, fecha de vencimiento.
 * No toca archivo_nombre ni certificado_path.
 */
export async function updateFirma(
  tenantId: number,
  dto: { certificado_pass?: string; nit_certificado?: string; fecha_vencimiento?: string },
): Promise<void> {
  const { encrypt } = await import('../utils/crypto');
  const sets: string[] = [];
  const params: (string | number | null)[] = [tenantId];
  let idx = 2;

  if (dto.certificado_pass) {
    sets.push(`certificado_pass = $${idx++}`);
    params.push(encrypt(dto.certificado_pass));
  }
  sets.push(`nit_certificado   = $${idx++}`);
  params.push(dto.nit_certificado   ?? null);
  sets.push(`fecha_vencimiento = $${idx++}`);
  params.push(dto.fecha_vencimiento ?? null);
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  if (sets.length > 1) {
    await pool.query(
      `UPDATE tenant_firma SET ${sets.join(', ')} WHERE tenant_id = $1`,
      params,
    );
  }
}
