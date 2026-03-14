/**
 * system.service.ts — Lógica de negocio para Health Check y Backups.
 *
 * Maneja:
 *   - Consultas de estado del sistema (DB ping, pool, memoria, tenants)
 *   - Listado de backups y estadísticas
 *   - Ejecución de backups en background
 */

import { pool }          from '../../config/database';
import { listBackups, getBackupStats } from '../../utils/backup';
import { performBackup } from '../../jobs/backup.job';

// ═══════════════════════════════════════════════════════════════════════════════
// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve el estado detallado del sistema:
 *   - DB: ping, latencia, versión, hora del servidor
 *   - Pool: conexiones total/idle/waiting
 *   - Proceso Node.js: uptime, memoria, versión, PID
 *   - Tenants: conteos por estado
 */
export async function getHealth() {
  // ── DB ping + latencia ────────────────────────────────────────────────────
  const t0 = Date.now();
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbLatencyMs  = -1;
  let dbVersion    = '';
  let dbServerTime: string | null = null;

  try {
    const { rows } = await pool.query(`SELECT version(), NOW() AS server_time`);
    dbLatencyMs  = Date.now() - t0;
    // "PostgreSQL 14.11 on x86_64..." → tomar las primeras dos palabras
    dbVersion    = rows[0].version.split(' ').slice(0, 2).join(' ');
    dbServerTime = rows[0].server_time;
  } catch {
    dbStatus = 'error';
  }

  // ── Pool stats (node-postgres expone estas propiedades) ───────────────────
  const poolStats = {
    total:   pool.totalCount,
    idle:    pool.idleCount,
    waiting: pool.waitingCount,
    max:     10,
  };

  // ── Estadísticas de tenants ───────────────────────────────────────────────
  let tenantStats = { total: 0, activos: 0, suspendidos: 0, en_pruebas: 0 };
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::INT                                              AS total,
        COUNT(*) FILTER (WHERE estado = 'activo')::INT            AS activos,
        COUNT(*) FILTER (WHERE estado = 'suspendido')::INT        AS suspendidos,
        COUNT(*) FILTER (WHERE estado = 'pruebas')::INT           AS en_pruebas
      FROM tenants
    `);
    tenantStats = rows[0];
  } catch { /* silencioso si la tabla aún no existe */ }

  // ── Proceso Node.js ───────────────────────────────────────────────────────
  const mem         = process.memoryUsage();
  const processInfo = {
    uptime_seconds: Math.floor(process.uptime()),
    node_version:   process.version,
    platform:       process.platform,
    arch:           process.arch,
    environment:    process.env.NODE_ENV ?? 'development',
    pid:            process.pid,
    memory: {
      rss_mb:        +(mem.rss       / 1024 / 1024).toFixed(1),
      heap_used_mb:  +(mem.heapUsed  / 1024 / 1024).toFixed(1),
      heap_total_mb: +(mem.heapTotal / 1024 / 1024).toFixed(1),
      external_mb:   +(mem.external  / 1024 / 1024).toFixed(1),
    },
  };

  return {
    status:    dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      status:      dbStatus,
      latency_ms:  dbLatencyMs,
      version:     dbVersion,
      server_time: dbServerTime,
      pool:        poolStats,
    },
    process: processInfo,
    tenants: tenantStats,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── BACKUPS ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Devuelve la lista de archivos de backup con estadísticas generales. */
export function getBackups() {
  const backups = listBackups();
  const stats   = getBackupStats();
  return { stats, backups };
}

/**
 * Dispara un backup manual en background.
 * Lanza el proceso sin esperar su resultado (fire-and-forget).
 */
export function runBackupInBackground(): void {
  performBackup().catch(err => {
    console.error('[SystemService] Error en backup manual:', err);
  });
}
