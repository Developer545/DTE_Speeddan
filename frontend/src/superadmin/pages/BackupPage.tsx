/**
 * BackupPage.tsx — Gestión de backups del sistema.
 *
 * Muestra:
 *   - Tarjetas de resumen: total de backups, tamaño total, último backup, retención
 *   - Botón de backup manual (POST /system/backups/run)
 *   - Tabla de archivos de backup con tipo, tamaño y fecha
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Database, HardDrive, Clock, RefreshCw, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { backupService, BackupFile, BackupStats } from '../services/superadmin.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-SV', {
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (h < 1)  return 'Hace menos de 1 hora';
  if (h < 24) return `Hace ${h} hora${h > 1 ? 's' : ''}`;
  return `Hace ${d} día${d > 1 ? 's' : ''}`;
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = colors.accent,
}: {
  icon:   React.ElementType;
  label:  string;
  value:  string | number;
  sub?:   string;
  color?: string;
}) {
  return (
    <div style={{
      background:   colors.cardBg,
      border:       `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      boxShadow:    shadow.card,
      padding:      '20px 24px',
      display:      'flex',
      alignItems:   'center',
      gap:          16,
      flex:         1,
      minWidth:     180,
    }}>
      <div style={{
        width:        42,
        height:       42,
        borderRadius: radius.md,
        background:   `${color}18`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        flexShrink:   0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: colors.textMuted, fontWeight: 500 }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: colors.textPrimary }}>{value}</p>
        {sub && <p style={{ margin: '1px 0 0', fontSize: 11, color: colors.textMuted }}>{sub}</p>}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: BackupFile['type'] }) {
  const isDb = type === 'database';
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      padding:      '3px 10px',
      borderRadius: 999,
      fontSize:     11,
      fontWeight:   600,
      background:   isDb ? `${colors.accent}18` : `${colors.success ?? '#10b981'}18`,
      color:        isDb ? colors.accent : (colors.success ?? '#10b981'),
    }}>
      {isDb ? <Database size={11} /> : <HardDrive size={11} />}
      {isDb ? 'Base de datos' : 'Uploads'}
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function BackupPage() {
  const [backups,  setBackups]  = useState<BackupFile[]>([]);
  const [stats,    setStats]    = useState<BackupStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [running,  setRunning]  = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await backupService.list();
      setStats(data.stats);
      setBackups(data.backups);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refrescar una vez tras ejecutar backup manual (después de 4 s)
  const handleRunBackup = async () => {
    setRunning(true);
    try {
      await backupService.runNow();
      showToast('Backup iniciado. Refrescando en 5 segundos...', true);
      setTimeout(() => load(), 5000);
    } catch (e: any) {
      showToast(e.message, false);
    } finally {
      setRunning(false);
    }
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.textPrimary }}>
            Backups del Sistema
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.textMuted }}>
            Backups automáticos diarios a las 02:00 (hora SV) · Retención{' '}
            {stats ? `${stats.retention_days} días` : '...'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={load}
            disabled={loading}
            title="Refrescar lista"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: radius.md,
              background: colors.mutedBg, border: `1px solid ${colors.border}`,
              fontSize: 13, color: colors.textSecondary, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refrescar
          </button>

          <button
            onClick={handleRunBackup}
            disabled={running || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: radius.md,
              background: running ? colors.mutedBg : colors.accent,
              border: 'none',
              fontSize: 13, fontWeight: 600,
              color: running ? colors.textSecondary : colors.accentText,
              cursor: (running || loading) ? 'not-allowed' : 'pointer',
              boxShadow: running ? 'none' : shadow.card,
              transition: 'all 0.15s',
            }}
          >
            <Play size={14} />
            {running ? 'Iniciando...' : 'Backup ahora'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: radius.md,
          background: toast.ok ? `${colors.success ?? '#10b981'}15` : `${colors.danger ?? '#ef4444'}15`,
          border: `1px solid ${toast.ok ? (colors.success ?? '#10b981') : (colors.danger ?? '#ef4444')}40`,
          marginBottom: 20, fontSize: 13,
          color: toast.ok ? (colors.success ?? '#10b981') : (colors.danger ?? '#ef4444'),
        }}>
          {toast.ok
            ? <CheckCircle size={15} />
            : <AlertTriangle size={15} />
          }
          {toast.msg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: radius.md,
          background: `${colors.danger ?? '#ef4444'}12`,
          border: `1px solid ${colors.danger ?? '#ef4444'}30`,
          color: colors.danger ?? '#ef4444',
          fontSize: 13, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard
            icon={Database}
            label="Total de backups"
            value={stats.total_backups}
            sub={`${stats.total_size_mb} MB en disco`}
          />
          <StatCard
            icon={HardDrive}
            label="Tamaño total"
            value={`${parseFloat(stats.total_size_mb) >= 1024
              ? (parseFloat(stats.total_size_mb) / 1024).toFixed(1) + ' GB'
              : stats.total_size_mb + ' MB'}`}
            sub="comprimido"
            color="#8b5cf6"
          />
          <StatCard
            icon={Clock}
            label="Último backup"
            value={stats.last_backup_at ? formatRelative(stats.last_backup_at) : 'Sin backups'}
            sub={stats.last_backup_at ? formatDate(stats.last_backup_at) : undefined}
            color="#f59e0b"
          />
          <StatCard
            icon={RefreshCw}
            label="Retención"
            value={`${stats.retention_days} días`}
            sub="luego se eliminan automáticamente"
            color="#10b981"
          />
        </div>
      )}

      {/* Tabla de backups */}
      <div style={{
        background:   colors.cardBg,
        border:       `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        boxShadow:    shadow.card,
        overflow:     'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
            Historial de backups
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
            Cargando...
          </div>
        ) : backups.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Database size={36} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, color: colors.textMuted, fontSize: 14 }}>
              No hay backups todavía.
            </p>
            <p style={{ margin: '6px 0 0', color: colors.textMuted, fontSize: 12 }}>
              El primer backup automático corre a las 02:00 AM. También puedes crear uno ahora con el botón de arriba.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.mutedBg }}>
                {['Archivo', 'Tipo', 'Tamaño', 'Fecha de creación'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, color: colors.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.map((b, i) => (
                <tr key={b.filename} style={{
                  borderTop: i === 0 ? 'none' : `1px solid ${colors.borderLight}`,
                  background: i % 2 === 0 ? 'transparent' : `${colors.mutedBg}60`,
                }}>
                  <td style={{ padding: '12px 16px', color: colors.textPrimary, fontFamily: 'monospace', fontSize: 12 }}>
                    {b.filename}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <TypeBadge type={b.type} />
                  </td>
                  <td style={{ padding: '12px 16px', color: colors.textSecondary }}>
                    {parseFloat(b.size_mb) >= 1024
                      ? `${(parseFloat(b.size_mb) / 1024).toFixed(2)} GB`
                      : `${b.size_mb} MB`}
                  </td>
                  <td style={{ padding: '12px 16px', color: colors.textSecondary }}>
                    {formatDate(b.created_at)}
                    <span style={{ marginLeft: 8, fontSize: 11, color: colors.textMuted }}>
                      ({formatRelative(b.created_at)})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Nota informativa */}
      <p style={{ marginTop: 16, fontSize: 12, color: colors.textMuted, lineHeight: 1.6 }}>
        Los backups de base de datos se guardan como archivos <code>.sql.gz</code> (pg_dump comprimido con gzip).
        Los backups de uploads copian el directorio <code>/uploads</code> completo.
        Los archivos más viejos de {stats?.retention_days ?? 30} días se eliminan automáticamente.
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
