/**
 * tenants.service.ts — Lógica de negocio para Tenants y toda su configuración.
 *
 * Maneja:
 *   - CRUD de tenants con seed inicial (TX de 9 INSERTs)
 *   - Sincronización de ambiente MH al cambiar estado del tenant
 *   - Registro de pagos (TX)
 *   - Configuración de API MH y Firma Digital por tenant
 *   - Reset de contraseña de usuarios del tenant
 *   - Token de impersonación (acceso al ERP del tenant)
 */

import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';

import { pool }     from '../../config/database';
import { env }      from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { encrypt }  from '../../utils/crypto';
import {
  TenantListItem,
  CreateTenantDTO,
  UpdateTenantDTO,
  CreatePagoDTO,
  UpdateApiMhDTO,
  UpdateFirmaMetaDTO,
} from '../models/superadmin.model';

const SALT_ROUNDS = 10;

// ── URLs de la API del Ministerio de Hacienda por ambiente ────────────────────
const MH_URLS = {
  pruebas: {
    url_auth:        'https://apitest.dtes.mh.gob.sv/seguridad/auth',
    url_transmision: 'https://apitest.dtes.mh.gob.sv/fesv/recepciondte',
  },
  produccion: {
    url_auth:        'https://api.dtes.mh.gob.sv/seguridad/auth',
    url_transmision: 'https://api.dtes.mh.gob.sv/fesv/recepciondte',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── TENANTS ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Devuelve la lista de todos los tenants con datos del plan y días para vencer. */
export async function getTenants(): Promise<TenantListItem[]> {
  const { rows } = await pool.query(`
    SELECT
      t.id, t.nombre, t.slug, t.email_contacto, t.telefono,
      t.estado, t.fecha_pago, t.fecha_suspension, t.created_at,
      p.nombre AS plan_nombre,
      CASE
        WHEN t.fecha_pago IS NOT NULL
        THEN (t.fecha_pago - CURRENT_DATE)
        ELSE NULL
      END AS dias_para_vencer
    FROM tenants t
    LEFT JOIN planes p ON p.id = t.plan_id
    ORDER BY t.created_at DESC
  `);
  return rows;
}

/** Devuelve el detalle completo de un tenant incluyendo configuración MH y firma. */
export async function getTenantById(id: number) {
  const { rows } = await pool.query(`
    SELECT
      t.id, t.nombre, t.slug, t.email_contacto, t.telefono,
      t.estado, t.fecha_pago, t.fecha_suspension, t.notas,
      t.plan_id, t.created_at, t.updated_at,
      p.nombre  AS plan_nombre,
      COALESCE(t.max_sucursales, p.max_sucursales)     AS max_sucursales,
      t.max_sucursales                                  AS max_sucursales_override,
      p.max_sucursales                                  AS plan_max_sucursales,
      COALESCE(t.max_puntos_venta, p.max_puntos_venta) AS max_puntos_venta,
      t.max_puntos_venta                                AS max_puntos_venta_override,
      p.max_puntos_venta                                AS plan_max_puntos_venta,
      COALESCE(t.max_usuarios, p.max_usuarios)          AS max_usuarios,
      t.max_usuarios                                    AS max_usuarios_override,
      p.max_usuarios                                    AS plan_max_usuarios,
      CASE WHEN t.fecha_pago IS NOT NULL THEN (t.fecha_pago - CURRENT_DATE) ELSE NULL END AS dias_para_vencer,
      mh.ambiente        AS api_ambiente,
      mh.usuario_api     AS api_usuario,
      mh.token_expira_en AS api_token_expira,
      f.archivo_nombre   AS firma_archivo,
      f.nit_certificado  AS firma_nit,
      f.fecha_vencimiento AS firma_vence
    FROM tenants t
    LEFT JOIN planes          p  ON p.id  = t.plan_id
    LEFT JOIN tenant_api_mh   mh ON mh.tenant_id = t.id
    LEFT JOIN tenant_firma    f  ON f.tenant_id  = t.id
    WHERE t.id = $1
  `, [id]);
  return rows[0] ?? null;
}

/**
 * Crea un nuevo tenant y realiza el seed inicial en una transacción:
 *   1. Registro en tenants
 *   2. Usuario admin de la empresa
 *   3. Configuración empresa vacía
 *   4. Tema por defecto
 *   5. Sucursal principal (Casa Matriz)
 *   6. Punto de venta principal (Caja Principal)
 *   7. Sequences DTE para los 5 tipos de DTE
 *   8. Registro vacío en tenant_api_mh (ambiente pruebas)
 *   9. Registro vacío en tenant_firma
 */
export async function createTenant(dto: CreateTenantDTO) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear el tenant
    const { rows: tenantRows } = await client.query(
      `INSERT INTO tenants (nombre, slug, email_contacto, telefono, plan_id, fecha_pago, notas, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pruebas')
       RETURNING *`,
      [
        dto.nombre,
        dto.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        dto.email_contacto ?? null,
        dto.telefono       ?? null,
        dto.plan_id        ?? null,
        dto.fecha_pago     || null,
        dto.notas          ?? null,
      ],
    );
    const tenant   = tenantRows[0];
    const tenantId = tenant.id;

    // 2. Crear usuario admin de la empresa
    const adminPassword = dto.admin_password ?? 'admin123';
    const adminHash     = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    await client.query(
      `INSERT INTO usuarios (nombre, username, password_hash, rol, tenant_id)
       VALUES ($1, $2, $3, 'admin', $4)`,
      [
        dto.admin_nombre   ?? 'Administrador',
        dto.admin_username ?? 'admin',
        adminHash,
        tenantId,
      ],
    );

    // 3. Configuración empresa vacía
    await client.query(
      `INSERT INTO configuracion_empresa (nombre_negocio, tenant_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [dto.nombre, tenantId],
    );

    // 4. Tema por defecto
    await client.query(
      `INSERT INTO configuracion_tema (accent, accent_text, page_bg, card_bg, sidebar_bg, tenant_id)
       VALUES ('#111111','#ffffff','#f5f5f5','#ffffff','#ffffff', $1)
       ON CONFLICT DO NOTHING`,
      [tenantId],
    );

    // 5. Sucursal principal
    const { rows: sucRows } = await client.query(
      `INSERT INTO sucursales (nombre, codigo, activo, tenant_id)
       VALUES ('Casa Matriz', 'M001', true, $1)
       RETURNING id`,
      [tenantId],
    );
    const sucursalId = sucRows[0].id;

    // 6. Punto de venta principal
    const { rows: pvRows } = await client.query(
      `INSERT INTO puntos_venta (sucursal_id, nombre, codigo, activo)
       VALUES ($1, 'Caja Principal', 'P001', true)
       RETURNING id`,
      [sucursalId],
    );
    const puntoVentaId = pvRows[0].id;

    // 7. Sequences DTE para el punto de venta
    const prefijo   = 'M001P001';
    const tiposDTE  = ['DTE_01', 'DTE_03', 'DTE_05', 'DTE_06', 'DTE_11'];
    for (const tipo of tiposDTE) {
      await client.query(
        `INSERT INTO numeros_dte (tipo_dte, numero_actual, prefijo, punto_venta_id)
         VALUES ($1, 0, $2, $3)
         ON CONFLICT DO NOTHING`,
        [tipo, prefijo, puntoVentaId],
      );
    }

    // 8. Registro en tenant_api_mh (ambiente pruebas por defecto)
    await client.query(
      `INSERT INTO tenant_api_mh (tenant_id, ambiente, url_auth, url_transmision)
       VALUES ($1, 'pruebas', $2, $3)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, MH_URLS.pruebas.url_auth, MH_URLS.pruebas.url_transmision],
    );

    // 9. Registro vacío en tenant_firma
    await client.query(
      `INSERT INTO tenant_firma (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId],
    );

    await client.query('COMMIT');
    return { tenant, admin_username: dto.admin_username ?? 'admin', admin_password: adminPassword };
  } catch (err: any) {
    await client.query('ROLLBACK');
    // Convertir error de unicidad de PG en AppError legible
    if (err.code === '23505') throw new AppError('El slug ya existe, elige otro código de empresa', 409);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Actualiza los datos de un tenant.
 * Al cambiar a 'activo' sincroniza el ambiente MH a producción.
 * Al cambiar a 'pruebas' sincroniza el ambiente MH a pruebas.
 */
export async function updateTenant(id: number, dto: UpdateTenantDTO) {
  const fields = Object.keys(dto) as (keyof UpdateTenantDTO)[];
  if (fields.length === 0) return getTenantById(id);

  // Sincronizar ambiente MH al cambiar estado
  if (dto.estado === 'activo') {
    await pool.query(
      `UPDATE tenant_api_mh
       SET ambiente = 'produccion', url_auth = $1, url_transmision = $2
       WHERE tenant_id = $3`,
      [MH_URLS.produccion.url_auth, MH_URLS.produccion.url_transmision, id],
    );
  }
  if (dto.estado === 'pruebas') {
    await pool.query(
      `UPDATE tenant_api_mh
       SET ambiente = 'pruebas', url_auth = $1, url_transmision = $2
       WHERE tenant_id = $3`,
      [MH_URLS.pruebas.url_auth, MH_URLS.pruebas.url_transmision, id],
    );
  }

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values     = fields.map(f => (dto[f] === '' ? null : (dto[f] ?? null)));

  const { rows } = await pool.query(
    `UPDATE tenants SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values],
  );
  if (!rows[0]) throw new AppError('Tenant no encontrado', 404);
  return rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PAGOS ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registra un pago del tenant y actualiza la fecha de vencimiento.
 * Si el tenant estaba suspendido y se proporciona nueva_fecha_vencimiento,
 * lo reactiva automáticamente.
 */
export async function registrarPago(
  tenantId:     number,
  dto:          CreatePagoDTO,
  superAdminId: number,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO tenant_pagos (tenant_id, monto, fecha_pago, metodo, notas, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tenantId,
        dto.monto,
        dto.fecha_pago  ?? new Date().toISOString().split('T')[0],
        dto.metodo      ?? null,
        dto.notas       ?? null,
        superAdminId,
      ],
    );

    // Actualizar vencimiento y reactivar si estaba suspendido
    if (dto.nueva_fecha_vencimiento) {
      await client.query(
        `UPDATE tenants
         SET fecha_pago = $1,
             estado = CASE WHEN estado = 'suspendido' THEN 'activo' ELSE estado END
         WHERE id = $2`,
        [dto.nueva_fecha_vencimiento, tenantId],
      );
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Devuelve el historial de pagos de un tenant ordenado por fecha descendente. */
export async function getPagosByTenant(tenantId: number) {
  const { rows } = await pool.query(
    `SELECT p.*, sa.nombre AS registrado_por_nombre
     FROM tenant_pagos p
     LEFT JOIN superadmin_users sa ON sa.id = p.registrado_por
     WHERE p.tenant_id = $1
     ORDER BY p.fecha_pago DESC, p.created_at DESC`,
    [tenantId],
  );
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── API MH ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Devuelve la configuración de API MH de un tenant (sin password_api). */
export async function getApiMh(tenantId: number) {
  const { rows } = await pool.query(
    `SELECT ambiente, url_auth, url_transmision, usuario_api,
            (password_api IS NOT NULL AND password_api <> '') AS tiene_password,
            (token_activo IS NOT NULL)                        AS tiene_token,
            token_expira_en, updated_at
     FROM tenant_api_mh WHERE tenant_id = $1`,
    [tenantId],
  );
  return rows[0] ?? null;
}

/** Actualiza la configuración de API MH de un tenant. La contraseña se cifra. */
export async function updateApiMh(tenantId: number, dto: UpdateApiMhDTO) {
  const sets:   string[]                  = [];
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
  sets.push('updated_at = CURRENT_TIMESTAMP');

  const { rows } = await pool.query(
    `INSERT INTO tenant_api_mh (tenant_id)
     VALUES ($1)
     ON CONFLICT (tenant_id) DO UPDATE
       SET ${sets.join(', ')}
     RETURNING tenant_id, ambiente, url_auth, url_transmision, usuario_api,
               (password_api IS NOT NULL AND password_api <> '') AS tiene_password,
               (token_activo IS NOT NULL)                        AS tiene_token,
               token_expira_en, updated_at`,
    params,
  );
  // NUNCA se devuelve password_api al frontend
  return rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── FIRMA DIGITAL ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Devuelve los metadatos de la firma digital de un tenant (sin contraseña). */
export async function getFirma(tenantId: number) {
  const { rows } = await pool.query(
    `SELECT tenant_id, archivo_nombre, nit_certificado, fecha_vencimiento, updated_at
     FROM tenant_firma WHERE tenant_id = $1`,
    [tenantId],
  );
  return rows[0] ?? null;
}

/**
 * Registra el archivo .p12/.pfx subido por el superadmin.
 * Guarda la ruta en disco en la tabla tenant_firma.
 */
export async function uploadFirma(
  tenantId:       number,
  archivoNombre:  string,
  certificadoPath: string,
) {
  const { rows } = await pool.query(
    `INSERT INTO tenant_firma (tenant_id, archivo_nombre, certificado_path)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id) DO UPDATE
       SET archivo_nombre   = EXCLUDED.archivo_nombre,
           certificado_path = EXCLUDED.certificado_path,
           updated_at       = CURRENT_TIMESTAMP
     RETURNING tenant_id, archivo_nombre, nit_certificado, fecha_vencimiento, updated_at`,
    [tenantId, archivoNombre, certificadoPath],
  );
  return rows[0];
}

/**
 * Actualiza los metadatos de la firma: contraseña (cifrada), NIT, fecha de vencimiento.
 * No modifica el archivo del certificado.
 */
export async function updateFirma(tenantId: number, dto: UpdateFirmaMetaDTO) {
  const sets:   string[]                  = [];
  const params: (string | number | null)[] = [tenantId];
  let idx = 2;

  if (dto.certificado_pass) {
    sets.push(`certificado_pass = $${idx++}`);
    params.push(encrypt(dto.certificado_pass));
  }
  sets.push(`nit_certificado   = $${idx++}`);
  params.push(dto.nit_certificado ?? null);
  sets.push(`fecha_vencimiento = $${idx++}`);
  params.push(dto.fecha_vencimiento ?? null);
  sets.push('updated_at = CURRENT_TIMESTAMP');

  const { rows } = await pool.query(
    `UPDATE tenant_firma SET ${sets.join(', ')}
     WHERE tenant_id = $1
     RETURNING tenant_id, archivo_nombre, nit_certificado, fecha_vencimiento, updated_at`,
    params,
  );
  // NUNCA se devuelve certificado_pass al frontend
  return rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── RESET DE CONTRASEÑA ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Genera una contraseña aleatoria segura de 10 caracteres. */
function generarPasswordTemporal(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Resetea la contraseña de un usuario del tenant.
 * Genera una contraseña temporal aleatoria y la guarda hasheada.
 * Retorna la contraseña en texto plano para comunicarla al cliente.
 */
export async function resetUsuarioPassword(userId: number, tenantId: number) {
  const { rows } = await pool.query(
    `SELECT id, username FROM usuarios WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId],
  );
  if (!rows[0]) throw new AppError('Usuario no encontrado', 404);

  const nuevaPassword = generarPasswordTemporal();
  const hash          = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);

  await pool.query(
    `UPDATE usuarios SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [hash, userId],
  );

  return { username: rows[0].username, nueva_password: nuevaPassword };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── IMPERSONACIÓN ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera un token temporal (15 min) que permite al superadmin entrar al ERP
 * de un tenant como su usuario admin. Lleva la marca impersonated: true.
 */
export async function generarTokenImpersonacion(tenantId: number): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id, nombre, username, rol
     FROM usuarios
     WHERE tenant_id = $1 AND rol = 'admin' AND activo = true
     ORDER BY id ASC
     LIMIT 1`,
    [tenantId],
  );
  if (!rows[0]) throw new AppError('El tenant no tiene un usuario admin activo', 400);

  const admin   = rows[0];
  const payload = {
    id:           admin.id,
    username:     admin.username,
    nombre:       admin.nombre,
    rol:          admin.rol,
    tenantId,
    impersonated: true, // marca para auditoría en logs
  };

  // Token de corta duración — 15 minutos, no renovable
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}
