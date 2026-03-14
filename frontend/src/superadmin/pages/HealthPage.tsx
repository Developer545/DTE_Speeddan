/**
 * HealthPage.tsx — Estado del sistema en tiempo real para el SuperAdmin.
 * Muestra: DB latencia + pool, proceso Node.js, tenants, auto-refresh.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Database, Server, Users, Clock, Cpu, HardDrive,
} from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { healthService, HealthData } from '../services/superadmin.service';

const REFRESH_MS = 30_000; // 30 s

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600)  / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-SV');
}

type StatusLevel = 'ok' | 'degraded' | 'error';

const STATUS_CONFIG: Record<StatusLevel, { label: string; bg: string; text: string; border: string; Icon: React.FC<{ size?: number; color?: string }> }> = {
  ok:       { label: 'Operativo',  bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', Icon: CheckCircle  },
  degraded: { label: 'Degradado',  bg: '#fffbeb', text: '#b45309', border: '#fde68a', Icon: AlertTriangle },
  error:    { label: 'Error',      bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', Icon: XCircle      },
};

// ── subcomponentes ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusLevel }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 99,
      background: cfg.bg, color: cfg.text,
      border: `1px solid ${cfg.border}`,
      fontSize: 13, fontWeight: 600,
    }}>
      <cfg.Icon size={14} color={cfg.text} />
      {cfg.label}
    </span>
  );
}

interface CardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  status?: StatusLevel;
}

function Card({ title, icon, children, status }: CardProps) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg ?? 12, boxShadow: shadow.card,
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: colors.accent }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>{title}</span>
        </div>
        {status && <StatusBadge status={status} />}
      </div>
      {children}
    </div>
  );
}

interface RowProps { label: string; value: React.ReactNode }
function Row({ label, value }: RowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0', borderBottom: `1px solid ${colors.borderLight}`,
    }}>
      <span style={{ fontSize: 13, color: colors.textSecondary }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{value}</span>
    </div>
  );
}

interface PoolBarProps { used: number; max: number }
function PoolBar({ used, max }: PoolBarProps) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  const color = pct > 80 ? '#dc2626' : pct > 50 ? '#d97706' : '#16a34a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 99,
        background: colors.mutedBg, overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 34, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

// ── página principal ──────────────────────────────────────────────────────────

export default function HealthPage() {
  const [data,        setData]        = useState<HealthData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [spinning,    setSpinning]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setSpinning(true);
    setError(null);
    try {
      const d = await healthService.get();
      setData(d);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Error al obtener datos de salud');
    } finally {
      setLoading(false);
      setTimeout(() => setSpinning(false), 600);
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchData]);

  // ── loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 28, width: 220, background: colors.mutedBg, borderRadius: 6, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 200, background: colors.mutedBg, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  // ── error ───────────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 60 }}>
        <XCircle size={40} color="#dc2626" />
        <p style={{ fontSize: 15, color: colors.textSecondary }}>{error}</p>
        <button
          onClick={fetchData}
          style={{
            padding: '8px 20px', borderRadius: radius.md ?? 8,
            background: colors.accent, color: colors.accentText,
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >Reintentar</button>
      </div>
    );
  }

  if (!data) return null;

  const overallStatus: StatusLevel =
    data.status === 'ok' ? 'ok' :
    data.status === 'degraded' ? 'degraded' : 'error';

  const dbStatus: StatusLevel = data.database.status === 'ok' ? 'ok' : 'error';
  const dbUsed = data.database.pool.total - data.database.pool.idle;
  const heapPct = Math.round((data.process.memory.heap_used_mb / data.process.memory.heap_total_mb) * 100);

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>

      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={22} color={colors.accent} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textPrimary }}>
            Estado del Sistema
          </h1>
          <StatusBadge status={overallStatus} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: colors.textMuted }}>
              Actualizado: {lastUpdated.toLocaleTimeString('es-SV')}
            </span>
          )}
          <button
            onClick={fetchData}
            title="Actualizar ahora"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: radius.md ?? 8,
              background: colors.cardBg, border: `1px solid ${colors.border}`,
              cursor: 'pointer', fontSize: 12, fontWeight: 600, color: colors.textSecondary,
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none' }}
            />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Banner de estado general ── */}
      {overallStatus !== 'ok' && (
        <div style={{
          padding: '12px 18px', borderRadius: radius.md ?? 8, marginBottom: 24,
          background: STATUS_CONFIG[overallStatus].bg,
          border: `1px solid ${STATUS_CONFIG[overallStatus].border}`,
          color: STATUS_CONFIG[overallStatus].text,
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={16} />
          El sistema presenta problemas. Revisa las secciones marcadas en rojo.
        </div>
      )}

      {/* ── Grid de tarjetas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>

        {/* Base de datos */}
        <Card title="Base de Datos" icon={<Database size={18} />} status={dbStatus}>
          <Row label="Estado"       value={<StatusBadge status={dbStatus} />} />
          <Row label="Latencia"     value={
            data.database.latency_ms >= 0
              ? <span style={{ color: data.database.latency_ms > 100 ? '#d97706' : '#16a34a', fontWeight: 700 }}>
                  {data.database.latency_ms} ms
                </span>
              : '—'
          } />
          <Row label="Versión"      value={data.database.version || '—'} />
          <Row label="Hora servidor" value={fmtTime(data.database.server_time)} />

          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Connection Pool ({dbUsed}/{data.database.pool.max})
            </p>
            <PoolBar used={dbUsed} max={data.database.pool.max} />
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[
                { label: 'Total',   val: data.database.pool.total   },
                { label: 'Idle',    val: data.database.pool.idle    },
                { label: 'Waiting', val: data.database.pool.waiting },
              ].map(({ label, val }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: colors.mutedBg, borderRadius: radius.sm ?? 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary }}>{val}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Proceso Node.js */}
        <Card title="Proceso Node.js" icon={<Server size={18} />}>
          <Row label="Uptime"       value={fmtUptime(data.process.uptime_seconds)} />
          <Row label="Node.js"      value={data.process.node_version} />
          <Row label="Plataforma"   value={`${data.process.platform} (${data.process.arch})`} />
          <Row label="Entorno"      value={
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: data.process.environment === 'production' ? '#f0fdf4' : '#eff6ff',
              color:      data.process.environment === 'production' ? '#15803d'  : '#1d4ed8',
              border: `1px solid ${data.process.environment === 'production' ? '#bbf7d0' : '#bfdbfe'}`,
            }}>
              {data.process.environment}
            </span>
          } />
          <Row label="PID"          value={data.process.pid} />

          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Heap ({data.process.memory.heap_used_mb} / {data.process.memory.heap_total_mb} MB)
            </p>
            <PoolBar used={data.process.memory.heap_used_mb} max={data.process.memory.heap_total_mb} />
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              {[
                { label: 'RSS',      val: `${data.process.memory.rss_mb} MB`       },
                { label: 'Heap',     val: `${heapPct}%`                             },
                { label: 'External', val: `${data.process.memory.external_mb} MB`  },
              ].map(({ label, val }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: colors.mutedBg, borderRadius: radius.sm ?? 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.textPrimary }}>{val}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Tenants */}
        <Card title="Tenants" icon={<Users size={18} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            {[
              { label: 'Total',        val: data.tenants.total,       color: colors.textPrimary },
              { label: 'Activos',      val: data.tenants.activos,     color: '#16a34a'          },
              { label: 'En pruebas',   val: data.tenants.en_pruebas,  color: '#2563eb'          },
              { label: 'Suspendidos',  val: data.tenants.suspendidos, color: '#dc2626'          },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                padding: '14px 16px', borderRadius: radius.md ?? 8,
                background: colors.mutedBg, border: `1px solid ${colors.borderLight}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tiempo y entorno */}
        <Card title="Servidor" icon={<Clock size={18} />}>
          <Row label="Timestamp (servidor)" value={fmtTime(data.timestamp)} />
          <Row label="Uptime formateado"    value={fmtUptime(data.process.uptime_seconds)} />
          <Row label="CPU Arch"             value={data.process.arch} />
          <Row label="OS Platform"          value={data.process.platform} />

          <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: radius.md ?? 8, background: colors.mutedBg, border: `1px solid ${colors.borderLight}` }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Resumen rápido
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { Icon: Database, label: 'DB latencia',  val: data.database.latency_ms >= 0 ? `${data.database.latency_ms} ms` : 'N/A' },
                { Icon: HardDrive, label: 'Heap usado',  val: `${data.process.memory.heap_used_mb} MB` },
                { Icon: Cpu,       label: 'RSS memoria', val: `${data.process.memory.rss_mb} MB` },
              ].map(({ Icon, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.textSecondary }}>
                    <Icon size={13} /> {label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Nota de auto-refresh ── */}
      <p style={{ marginTop: 20, fontSize: 12, color: colors.textMuted, textAlign: 'right' }}>
        Auto-actualización cada {REFRESH_MS / 1000} segundos
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
