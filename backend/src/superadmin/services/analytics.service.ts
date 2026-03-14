/**
 * analytics.service.ts — Lógica de negocio para Analytics, Dashboard, Mapa y Auditoría.
 *
 * Maneja:
 *   - KPIs del dashboard (tenants, MRR, alertas por vencer)
 *   - Series temporales de ingresos, nuevos tenants, activaciones/suspensiones
 *   - Distribución geográfica de tenants por departamento
 *   - Log de auditoría paginado con filtros dinámicos
 */

import { pool } from '../../config/database';

// ═══════════════════════════════════════════════════════════════════════════════
// ── DASHBOARD ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve KPIs del panel principal:
 * conteos de tenants, MRR, ingresos del mes, alertas por vencer/vencidos.
 */
export async function getDashboardStats() {
  const { rows: counts } = await pool.query(`
    SELECT
      COUNT(*)::INT                                                         AS total,
      COUNT(*) FILTER (WHERE estado = 'activo')::INT                        AS activos,
      COUNT(*) FILTER (WHERE estado = 'pruebas')::INT                       AS en_pruebas,
      COUNT(*) FILTER (WHERE estado = 'suspendido')::INT                    AS suspendidos,
      COUNT(*) FILTER (WHERE fecha_pago IS NOT NULL
                         AND fecha_pago - CURRENT_DATE BETWEEN 0 AND 7
                         AND estado IN ('activo','pruebas'))::INT            AS por_vencer,
      COUNT(*) FILTER (WHERE fecha_pago IS NOT NULL
                         AND fecha_pago < CURRENT_DATE
                         AND estado IN ('activo','pruebas'))::INT            AS vencidos,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::INT  AS nuevos_semana,
      COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::INT AS nuevos_mes
    FROM tenants
  `);

  const { rows: mrr } = await pool.query(`
    SELECT COALESCE(SUM(p.precio), 0)::NUMERIC AS mrr
    FROM tenants t
    JOIN planes p ON p.id = t.plan_id
    WHERE t.estado = 'activo'
  `);

  const { rows: ingresosMes } = await pool.query(`
    SELECT COALESCE(SUM(monto), 0)::NUMERIC AS ingresos_mes
    FROM tenant_pagos
    WHERE fecha_pago >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  const { rows: ingresosMesAnterior } = await pool.query(`
    SELECT COALESCE(SUM(monto), 0)::NUMERIC AS ingresos_mes_anterior
    FROM tenant_pagos
    WHERE fecha_pago >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND fecha_pago <  DATE_TRUNC('month', CURRENT_DATE)
  `);

  // Tenants por vencer en los próximos 7 días (lista de acción rápida)
  const { rows: alertasPorVencer } = await pool.query(`
    SELECT t.id, t.nombre, t.slug, t.fecha_pago,
           (t.fecha_pago - CURRENT_DATE) AS dias_restantes,
           p.nombre AS plan_nombre
    FROM tenants t
    LEFT JOIN planes p ON p.id = t.plan_id
    WHERE t.estado IN ('activo', 'pruebas')
      AND t.fecha_pago IS NOT NULL
      AND t.fecha_pago - CURRENT_DATE BETWEEN 0 AND 7
    ORDER BY t.fecha_pago ASC
    LIMIT 10
  `);

  // Tenants ya vencidos (requieren atención inmediata)
  const { rows: alertasVencidos } = await pool.query(`
    SELECT t.id, t.nombre, t.slug, t.fecha_pago,
           (CURRENT_DATE - t.fecha_pago) AS dias_vencido,
           p.nombre AS plan_nombre
    FROM tenants t
    LEFT JOIN planes p ON p.id = t.plan_id
    WHERE t.estado IN ('activo', 'pruebas')
      AND t.fecha_pago IS NOT NULL
      AND t.fecha_pago < CURRENT_DATE
    ORDER BY t.fecha_pago ASC
    LIMIT 10
  `);

  return {
    ...counts[0],
    mrr:                   parseFloat(mrr[0].mrr),
    ingresos_mes:          parseFloat(ingresosMes[0].ingresos_mes),
    ingresos_mes_anterior: parseFloat(ingresosMesAnterior[0].ingresos_mes_anterior),
    alertas_por_vencer:    alertasPorVencer,
    alertas_vencidos:      alertasVencidos,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ANALYTICS ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve series temporales y distribuciones para el panel de analítica:
 *   - Ingresos por mes (últimos 12 meses)
 *   - Nuevos tenants por mes (últimos 12 meses)
 *   - Activaciones y suspensiones por mes (desde audit_log)
 *   - Distribución por plan
 *   - Distribución por estado
 *   - KPIs derivados: crecimiento MoM, ingresos YTD, actividad del mes
 */
export async function getAnalytics() {
  const [ingresos, nuevos, actividad, porPlan, porEstado] = await Promise.all([

    // Ingresos por mes (últimos 12 meses) desde tenant_pagos
    pool.query(`
      SELECT
        TO_CHAR(gs.m, 'YYYY-MM')  AS mes,
        TO_CHAR(gs.m, 'Mon YY')   AS mes_label,
        COALESCE(SUM(tp.monto), 0)::NUMERIC AS ingresos
      FROM GENERATE_SERIES(
        DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      ) AS gs(m)
      LEFT JOIN tenant_pagos tp
        ON DATE_TRUNC('month', tp.fecha_pago::timestamp) = gs.m
      GROUP BY gs.m
      ORDER BY gs.m
    `),

    // Nuevos tenants por mes (últimos 12 meses)
    pool.query(`
      SELECT
        TO_CHAR(gs.m, 'YYYY-MM')  AS mes,
        TO_CHAR(gs.m, 'Mon YY')   AS mes_label,
        COUNT(t.id)::INT           AS nuevos
      FROM GENERATE_SERIES(
        DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      ) AS gs(m)
      LEFT JOIN tenants t
        ON DATE_TRUNC('month', t.created_at) = gs.m
      GROUP BY gs.m
      ORDER BY gs.m
    `),

    // Activaciones y suspensiones por mes (desde audit_log)
    pool.query(`
      SELECT
        TO_CHAR(gs.m, 'YYYY-MM')  AS mes,
        TO_CHAR(gs.m, 'Mon YY')   AS mes_label,
        COUNT(al.id) FILTER (WHERE al.accion = 'activar_tenant')::INT    AS activaciones,
        COUNT(al.id) FILTER (WHERE al.accion = 'suspender_tenant')::INT  AS suspensiones
      FROM GENERATE_SERIES(
        DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      ) AS gs(m)
      LEFT JOIN audit_log al
        ON DATE_TRUNC('month', al.created_at) = gs.m
        AND al.accion IN ('activar_tenant', 'suspender_tenant')
      GROUP BY gs.m
      ORDER BY gs.m
    `),

    // Distribución por plan (solo planes activos con tenants)
    pool.query(`
      SELECT
        COALESCE(p.nombre, 'Sin plan')         AS plan,
        COUNT(t.id)::INT                        AS total,
        COUNT(t.id) FILTER (WHERE t.estado = 'activo')::INT AS activos,
        COALESCE(p.precio, 0)::NUMERIC          AS precio
      FROM tenants t
      LEFT JOIN planes p ON p.id = t.plan_id
      GROUP BY p.nombre, p.precio
      ORDER BY total DESC
    `),

    // Distribución por estado
    pool.query(`
      SELECT estado, COUNT(*)::INT AS total
      FROM tenants
      GROUP BY estado
      ORDER BY total DESC
    `),
  ]);

  // Combinar las tres series temporales en una sola colección
  const serieMap: Record<string, {
    mes: string; mes_label: string;
    ingresos: number; nuevos: number;
    activaciones: number; suspensiones: number;
  }> = {};

  for (const r of ingresos.rows) {
    serieMap[r.mes] = { mes: r.mes, mes_label: r.mes_label, ingresos: parseFloat(r.ingresos), nuevos: 0, activaciones: 0, suspensiones: 0 };
  }
  for (const r of nuevos.rows) {
    if (serieMap[r.mes]) serieMap[r.mes].nuevos = r.nuevos;
  }
  for (const r of actividad.rows) {
    if (serieMap[r.mes]) {
      serieMap[r.mes].activaciones = r.activaciones;
      serieMap[r.mes].suspensiones = r.suspensiones;
    }
  }

  const serie = Object.values(serieMap).sort((a, b) => a.mes.localeCompare(b.mes));

  // KPIs derivados
  const mesActual   = serie[serie.length - 1];
  const mesAnterior = serie[serie.length - 2];
  const crecimientoMoM = mesAnterior?.ingresos > 0
    ? +((mesActual.ingresos - mesAnterior.ingresos) / mesAnterior.ingresos * 100).toFixed(1)
    : 0;
  const ingresoYTD = serie
    .filter(s => s.mes.startsWith(new Date().getFullYear().toString()))
    .reduce((acc, s) => acc + s.ingresos, 0);

  return {
    serie,
    por_plan:   porPlan.rows.map(r => ({ ...r, precio: parseFloat(r.precio), total: r.total, activos: r.activos })),
    por_estado: porEstado.rows,
    kpis: {
      crecimiento_mom:  crecimientoMoM,
      ingreso_ytd:      +ingresoYTD.toFixed(2),
      nuevos_mes:       mesActual?.nuevos       ?? 0,
      suspensiones_mes: mesActual?.suspensiones ?? 0,
      activaciones_mes: mesActual?.activaciones ?? 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAPA DE CLIENTES ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Distribución de tenants por departamento de El Salvador.
 * Une tenants → configuracion_empresa → cat_departamentos (por FK departamento_id).
 */
export async function getMapaClientes() {
  const [porDepto, sinUbicacion] = await Promise.all([

    // Tenants con departamento configurado (usando FK departamento_id)
    pool.query(`
      SELECT
        d.codigo,
        d.nombre,
        COUNT(t.id)::INT                                            AS total,
        COUNT(t.id) FILTER (WHERE t.estado = 'activo')::INT        AS activos,
        COUNT(t.id) FILTER (WHERE t.estado = 'suspendido')::INT    AS suspendidos,
        COUNT(t.id) FILTER (WHERE t.estado = 'pruebas')::INT       AS en_pruebas
      FROM cat_departamentos d
      LEFT JOIN configuracion_empresa ce ON ce.departamento_id = d.id
      LEFT JOIN tenants t               ON t.id = ce.tenant_id
      WHERE d.codigo != '00'
      GROUP BY d.id, d.codigo, d.nombre
      ORDER BY total DESC, d.nombre
    `),

    // Tenants sin departamento asignado
    pool.query(`
      SELECT COUNT(t.id)::INT AS sin_ubicacion
      FROM tenants t
      LEFT JOIN configuracion_empresa ce ON ce.tenant_id = t.id
      WHERE ce.departamento_id IS NULL OR ce.id IS NULL
    `),
  ]);

  return {
    departamentos: porDepto.rows,
    sin_ubicacion: sinUbicacion.rows[0].sin_ubicacion ?? 0,
    total_tenants: porDepto.rows.reduce((s: number, r: { total: number }) => s + r.total, 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── VISOR DE AUDITORÍA ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditLogFilters {
  actor_tipo?:  string;
  accion?:      string;
  tenant_id?:   string;
  fecha_inicio?: string;
  fecha_fin?:   string;
}

/**
 * Devuelve el audit_log paginado con filtros dinámicos opcionales.
 * Incluye JOIN con superadmin_users y tenants para enriquecer cada registro.
 */
export async function getAuditLog(
  page:    number,
  limit:   number,
  filters: AuditLogFilters,
) {
  const offset = (page - 1) * limit;

  // Construir cláusulas WHERE dinámicamente para evitar SQL injection
  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (filters.actor_tipo) {
    params.push(filters.actor_tipo);
    conditions.push(`al.actor_tipo = $${params.length}`);
  }
  if (filters.accion) {
    params.push(filters.accion);
    conditions.push(`al.accion = $${params.length}`);
  }
  if (filters.tenant_id) {
    params.push(parseInt(filters.tenant_id, 10));
    conditions.push(`al.tenant_id = $${params.length}`);
  }
  if (filters.fecha_inicio) {
    params.push(filters.fecha_inicio);
    conditions.push(`al.created_at >= $${params.length}::date`);
  }
  if (filters.fecha_fin) {
    params.push(filters.fecha_fin);
    conditions.push(`al.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Conteo total para paginación
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::INT AS total FROM audit_log al ${where}`,
    params,
  );
  const total = countRows[0].total as number;

  // Registros paginados con JOINs de enriquecimiento
  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT
       al.id,
       al.actor_id,
       al.actor_tipo,
       al.accion,
       al.tenant_id,
       al.detalle,
       al.ip,
       al.created_at,
       su.nombre   AS actor_nombre,
       su.username AS actor_username,
       t.nombre    AS tenant_nombre,
       t.slug      AS tenant_slug
     FROM audit_log al
     LEFT JOIN superadmin_users su ON su.id = al.actor_id AND al.actor_tipo = 'superadmin'
     LEFT JOIN tenants t           ON t.id  = al.tenant_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    items: rows,
  };
}
