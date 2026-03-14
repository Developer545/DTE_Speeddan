/**
 * backup.ts — Utilidades para backup de base de datos y directorio /uploads.
 *
 * Funciones:
 *   runDatabaseBackup()  — Ejecuta pg_dump y comprime el resultado con gzip.
 *   runUploadsBackup()   — Copia el directorio /uploads con marca de tiempo.
 *   listBackups()        — Lista todos los archivos de backup con metadatos.
 *   cleanupOldBackups()  — Elimina backups más viejos que BACKUP_RETENTION_DAYS.
 *   getBackupStats()     — Resumen estadístico del directorio de backups.
 *
 * Variables de entorno:
 *   BACKUP_DIR              — Ruta destino de backups (default: ../backups)
 *   BACKUP_RETENTION_DAYS   — Días a conservar (default: 30)
 */

import { spawn }     from 'child_process';
import { createGzip } from 'zlib';
import fs             from 'fs';
import path           from 'path';
import { env }        from '../config/env';

// ── Configuración ─────────────────────────────────────────────────────────────

const BACKUP_DIR = process.env.BACKUP_DIR
  || path.join(__dirname, '..', '..', '..', 'backups');

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

// Ruta del directorio uploads (relativa a la raíz del proyecto)
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface BackupFile {
  filename:   string;
  type:       'database' | 'uploads';
  size_bytes: number;
  size_mb:    string;
  created_at: string;   // ISO timestamp parseado desde el nombre del archivo
}

export interface BackupStats {
  total_backups:  number;
  total_size_mb:  string;
  last_backup_at: string | null;
  retention_days: number;
  backup_dir:     string;
}

export interface BackupResult {
  db?:      string;           // nombre del archivo de backup de DB
  uploads?: string | null;    // nombre del directorio de uploads
  deleted?: number;           // cantidad de backups eliminados
  error?:   string;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Genera un timestamp en formato YYYY-MM-DD_HH-MM-SS */
function nowTimestamp(): string {
  return new Date()
    .toISOString()
    .replace('T', '_')
    .replace(/:/g, '-')
    .substring(0, 19);
}

/** Parsea el timestamp embebido en el nombre del archivo */
function parseDateFromFilename(filename: string): Date {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
  if (!match) return new Date(0);
  const isoStr = `${match[1]}T${match[2].replace(/-/g, ':')}`;
  return new Date(isoStr);
}

/** Crea el directorio de backups si no existe */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/** Calcula el tamaño recursivo de un directorio en bytes */
function getDirSize(dirPath: string): number {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const p = path.join(dirPath, entry.name);
      total += entry.isDirectory() ? getDirSize(p) : fs.statSync(p).size;
    }
  } catch { /* directorio inaccesible */ }
  return total;
}

// ── Backup de base de datos ───────────────────────────────────────────────────

/**
 * Ejecuta pg_dump y comprime el volcado SQL con gzip.
 * Requiere que pg_dump esté en el PATH del sistema.
 * Usa PGPASSWORD para evitar el prompt interactivo.
 * @returns Nombre del archivo generado (e.g. "backup_db_2024-01-15_02-00-00.sql.gz")
 */
export async function runDatabaseBackup(): Promise<string> {
  ensureBackupDir();

  const filename = `backup_db_${nowTimestamp()}.sql.gz`;
  const destPath = path.join(BACKUP_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const pgDump = spawn('pg_dump', [
      '-h', env.DB_HOST,
      '-p', String(env.DB_PORT),
      '-U', env.DB_USER,
      env.DB_NAME,
    ], {
      env: {
        ...process.env,
        PGPASSWORD: env.DB_PASSWORD,
      },
    });

    const gzip   = createGzip({ level: 6 });
    const output = fs.createWriteStream(destPath);

    // Función de fallo única para no llamar reject dos veces
    let failed = false;
    const fail = (err: Error) => {
      if (failed) return;
      failed = true;
      gzip.destroy();
      output.destroy();
      try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch { /* ignore */ }
      reject(err);
    };

    pgDump.on('error', (err) =>
      fail(new Error(`pg_dump no encontrado en PATH: ${err.message}. Instale PostgreSQL client tools.`))
    );
    gzip.on('error',   fail);
    output.on('error', fail);

    pgDump.stderr.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.warn('[Backup] pg_dump:', msg);
    });

    pgDump.on('close', (code) => {
      if (code !== 0) fail(new Error(`pg_dump terminó con código de salida ${code}`));
    });

    output.on('finish', () => {
      if (!failed) resolve();
    });

    // Conectar el pipeline: pg_dump stdout → gzip → archivo
    pgDump.stdout.pipe(gzip).pipe(output);
  });

  const { size } = fs.statSync(destPath);
  console.log(`[Backup] DB completado: ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  return filename;
}

// ── Backup de directorio uploads ──────────────────────────────────────────────

/**
 * Copia el directorio /uploads a una subcarpeta con timestamp en BACKUP_DIR.
 * Incluye certificados digitales (.p12/.pfx), imágenes y cualquier otro archivo.
 * @returns Nombre de la carpeta creada, o null si /uploads no existe.
 */
export async function runUploadsBackup(): Promise<string | null> {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('[Backup] Directorio /uploads no existe, omitiendo.');
    return null;
  }

  ensureBackupDir();

  const folderName = `backup_uploads_${nowTimestamp()}`;
  const destPath   = path.join(BACKUP_DIR, folderName);

  fs.cpSync(UPLOADS_DIR, destPath, { recursive: true });

  const size = getDirSize(destPath);
  console.log(`[Backup] Uploads completado: ${folderName} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  return folderName;
}

// ── Listado ───────────────────────────────────────────────────────────────────

/**
 * Lista todos los archivos/carpetas de backup en BACKUP_DIR,
 * ordenados por fecha descendente (más reciente primero).
 */
export function listBackups(): BackupFile[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  const backups: BackupFile[] = [];

  for (const entry of fs.readdirSync(BACKUP_DIR, { withFileTypes: true })) {
    const { name } = entry;
    const entryPath = path.join(BACKUP_DIR, name);
    let type: BackupFile['type'];
    let size: number;

    if (name.startsWith('backup_db_')) {
      type = 'database';
      size = fs.statSync(entryPath).size;
    } else if (name.startsWith('backup_uploads_')) {
      type = 'uploads';
      size = entry.isDirectory() ? getDirSize(entryPath) : fs.statSync(entryPath).size;
    } else {
      continue;
    }

    backups.push({
      filename:   name,
      type,
      size_bytes: size,
      size_mb:    (size / 1024 / 1024).toFixed(2),
      created_at: parseDateFromFilename(name).toISOString(),
    });
  }

  return backups.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ── Limpieza por retención ────────────────────────────────────────────────────

/**
 * Elimina backups más viejos que BACKUP_RETENTION_DAYS días.
 * @returns Número de entradas eliminadas.
 */
export function cleanupOldBackups(): number {
  if (!fs.existsSync(BACKUP_DIR)) return 0;

  const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const entry of fs.readdirSync(BACKUP_DIR, { withFileTypes: true })) {
    const { name } = entry;
    if (!name.startsWith('backup_')) continue;

    const entryDate = parseDateFromFilename(name);
    if (entryDate.getTime() > cutoffMs) continue;

    const entryPath = path.join(BACKUP_DIR, name);
    try {
      if (entry.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(entryPath);
      }
      console.log(`[Backup] Eliminado backup antiguo: ${name}`);
      deleted++;
    } catch (err) {
      console.error(`[Backup] Error al eliminar ${name}:`, err);
    }
  }

  return deleted;
}

// ── Estadísticas ──────────────────────────────────────────────────────────────

/** Devuelve un resumen del estado actual del directorio de backups. */
export function getBackupStats(): BackupStats {
  const backups   = listBackups();
  const totalSize = backups.reduce((s, b) => s + b.size_bytes, 0);

  return {
    total_backups:  backups.length,
    total_size_mb:  (totalSize / 1024 / 1024).toFixed(2),
    last_backup_at: backups.length > 0 ? backups[0].created_at : null,
    retention_days: RETENTION_DAYS,
    backup_dir:     BACKUP_DIR,
  };
}
