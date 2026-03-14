/**
 * billing.job.ts — Cron jobs de facturación y mantenimiento de tenants.
 *
 * Jobs registrados:
 *   autoSuspendExpiredTenants  — corre cada día a las 00:05
 *     Suspende tenants cuya fecha_pago venció hace más de GRACE_PERIOD_DAYS días.
 *     Registra cada suspensión en audit_log con actor_tipo='sistema'.
 *
 * Inicialización: llamar initBillingJobs() una vez al arrancar el servidor.
 */

import cron from 'node-cron';
import { pool }                from '../config/database';
import { env }                 from '../config/env';
import { logAudit, AUDIT_ACCIONES } from '../utils/audit';

// ── Suspensión automática ─────────────────────────────────────────────────────

async function autoSuspendExpiredTenants(): Promise<void> {
  const grace = env.GRACE_PERIOD_DAYS;

  try {
    // Selecciona tenants activos/en pruebas con fecha_pago vencida
    // pasado el período de gracia
    const { rows } = await pool.query<{ id: number; nombre: string; slug: string; fecha_pago: string }>(
      `SELECT id, nombre, slug, fecha_pago
       FROM tenants
       WHERE estado IN ('activo', 'pruebas')
         AND fecha_pago IS NOT NULL
         AND fecha_pago < CURRENT_DATE - $1::INT`,
      [grace]
    );

    if (rows.length === 0) return;

    console.log(`[BillingJob] Suspendiendo ${rows.length} tenant(s) vencidos...`);

    for (const tenant of rows) {
      await pool.query(
        `UPDATE tenants SET estado = 'suspendido', fecha_suspension = NOW() WHERE id = $1`,
        [tenant.id]
      );

      await logAudit({
        actorTipo: 'sistema',
        accion:    AUDIT_ACCIONES.SUSPENDER_TENANT,
        tenantId:  tenant.id,
        detalle:   {
          razon:          'Vencimiento automático',
          fecha_pago:     tenant.fecha_pago,
          grace_days:     grace,
        },
      });

      console.log(`[BillingJob] Tenant suspendido: ${tenant.nombre} (${tenant.slug}) — venció: ${tenant.fecha_pago}`);
    }
  } catch (err) {
    console.error('[BillingJob] Error en autoSuspendExpiredTenants:', err);
  }
}

// ── Registro de jobs ──────────────────────────────────────────────────────────

export function initBillingJobs(): void {
  // Corre a las 00:05 todos los días
  // Formato cron: minuto hora día mes díaSemana
  cron.schedule('5 0 * * *', async () => {
    console.log('[BillingJob] Ejecutando suspensión automática...');
    await autoSuspendExpiredTenants();
  }, {
    timezone: 'America/El_Salvador',
  });

  console.log('[BillingJob] Jobs de facturación inicializados (suspensión a las 00:05 hora SV)');
}
