/**
 * backup.job.ts — Cron job de backup automático.
 *
 * Jobs registrados:
 *   performBackup  — corre cada día a las 02:00 hora El Salvador
 *     1. Ejecuta pg_dump y comprime el volcado (backup_db_*.sql.gz)
 *     2. Copia el directorio /uploads (backup_uploads_*)
 *     3. Elimina backups más viejos que BACKUP_RETENTION_DAYS días
 *     4. Registra resultado en audit_log (actor_tipo='sistema')
 *
 * Inicialización: llamar initBackupJobs() una vez al arrancar el servidor.
 */

import cron from 'node-cron';
import {
  runDatabaseBackup,
  runUploadsBackup,
  cleanupOldBackups,
  BackupResult,
} from '../utils/backup';
import { logAudit, AUDIT_ACCIONES } from '../utils/audit';

// ── Lógica del backup ─────────────────────────────────────────────────────────

async function performBackup(): Promise<void> {
  console.log('[BackupJob] Iniciando backup automático...');
  const result: BackupResult = {};

  // 1. Backup de base de datos (crítico — si falla, no continúa)
  try {
    result.db = await runDatabaseBackup();
  } catch (err: any) {
    result.error = err.message;
    console.error('[BackupJob] ERROR crítico en backup de DB:', err.message);

    await logAudit({
      actorTipo: 'sistema',
      accion:    AUDIT_ACCIONES.BACKUP_FALLIDO,
      detalle:   { tipo: 'database', error: err.message },
    });

    // Alerta visual en consola para que no pase desapercibido
    console.error('╔════════════════════════════════════════════╗');
    console.error('║  ⚠ BACKUP DE BASE DE DATOS FALLÓ          ║');
    console.error(`║  ${err.message.substring(0, 42).padEnd(42)} ║`);
    console.error('╚════════════════════════════════════════════╝');
    return;
  }

  // 2. Backup de uploads (no crítico — se continúa si falla)
  try {
    result.uploads = await runUploadsBackup();
  } catch (err: any) {
    console.error('[BackupJob] Advertencia: fallo en backup de uploads:', err.message);
    result.uploads = null;
  }

  // 3. Limpieza de backups antiguos
  try {
    result.deleted = cleanupOldBackups();
    if (result.deleted > 0) {
      console.log(`[BackupJob] ${result.deleted} backup(s) antiguo(s) eliminado(s).`);
    }
  } catch (err: any) {
    console.error('[BackupJob] Advertencia: fallo en limpieza:', err.message);
  }

  // 4. Registro de éxito en auditoría
  await logAudit({
    actorTipo: 'sistema',
    accion:    AUDIT_ACCIONES.BACKUP_EXITOSO,
    detalle:   {
      db:      result.db,
      uploads: result.uploads,
      deleted: result.deleted ?? 0,
    },
  });

  console.log('[BackupJob] Backup completado exitosamente:', result);
}

// ── Registro de jobs ──────────────────────────────────────────────────────────

export function initBackupJobs(): void {
  // Corre a las 02:00 todos los días
  // Formato cron: minuto hora día mes díaSemana
  cron.schedule('0 2 * * *', async () => {
    await performBackup();
  }, {
    timezone: 'America/El_Salvador',
  });

  console.log('[BackupJob] Job de backup inicializado (diario a las 02:00 hora SV)');
}

// Exportar para poder ejecutar manualmente desde el endpoint
export { performBackup };
