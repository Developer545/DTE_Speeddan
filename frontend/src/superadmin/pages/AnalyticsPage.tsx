/**
 * AnalyticsPage.tsx — Panel de analítica SaaS para el SuperAdmin.
 * Muestra tendencias de ingresos, crecimiento de tenants, distribución
 * por plan/estado y KPIs derivados. Usa recharts (ya instalado en el proyecto).
 */

import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area,
  BarChart,  Bar,
  PieChart,  Pie, Cell,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend,
} from 'recharts';
import { BarChart2, TrendingUp, TrendingDown, Users, DollarSign, RefreshCw } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { analyticsService, AnalyticsData } from '../services/superadmin.service';

// ── Paleta de colores ─────────────────────────────────────────────────────────

const COLORS_PLAN   = ['#111111', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo:     { label: 'Activo',     color: '#10b981' },
  pruebas:    { label: 'En pruebas', color: '#f59e0b' },
  suspendido: { label: 'Suspendido', color: '#ef4444' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (v: number) => v.toLocaleString('es-SV');

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, prefix = '', suffix = '', color, trend, Icon }: {
  label: string; value: number | string; prefix?: string; suffix?: string;
  color: string; trend?: number; Icon: React.FC<{ size?: number; color?: string }>;
}) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg ?? 12, boxShadow: shadow.card,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: colors.textPrimary }}>
        {prefix}{typeof value === 'number' ? (Number.isInteger(value) ? fmtInt(value) : fmt(value)) : value}{suffix}
      </p>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          {trend >= 0
            ? <TrendingUp  size={13} color="#10b981" />
            : <TrendingDown size={13} color="#ef4444" />
          }
          <span style={{ color: trend >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span style={{ color: colors.textMuted }}>vs mes anterior</span>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de gráfico ────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg ?? 12, boxShadow: shadow.card,
      padding: '20px 22px',
    }}>
      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>{title}</p>
      {subtitle && <p style={{ margin: '0 0 18px', fontSize: 12, color: colors.textMuted }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 18 }} />}
      {children}
    </div>
  );
}

// ── Tooltips personalizados ───────────────────────────────────────────────────

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 14px', boxShadow: shadow.card }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: colors.textPrimary }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: '2px 0', fontSize: 12, color: p.color }}>
          {p.name}: <strong>${fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function CountTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 14px', boxShadow: shadow.card }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: colors.textPrimary }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: '2px 0', fontSize: 12, color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px', boxShadow: shadow.card }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: p.payload.fill }}>{p.name}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.textSecondary }}>{p.value} tenants</p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsService.get());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 28, width: 200, background: colors.mutedBg, borderRadius: 6, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 110, background: colors.mutedBg, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 280, background: colors.mutedBg, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 32, textAlign: 'center', marginTop: 60 }}>
        <p style={{ color: '#dc2626' }}>{error ?? 'Sin datos'}</p>
        <button onClick={fetchData} style={{ padding: '8px 20px', borderRadius: 8, background: colors.accent, color: colors.accentText, border: 'none', cursor: 'pointer', marginTop: 12 }}>
          Reintentar
        </button>
      </div>
    );
  }

  const { serie, por_plan, por_estado, kpis } = data;

  // Construir datos para Pie de estado con etiquetas legibles
  const pieEstado = por_estado.map(e => ({
    name:  ESTADO_CONFIG[e.estado]?.label ?? e.estado,
    value: e.total,
    fill:  ESTADO_CONFIG[e.estado]?.color ?? colors.textMuted,
  }));

  // Construir datos para Pie de planes
  const piePlan = por_plan.map((p, i) => ({
    name:  p.plan,
    value: p.total,
    fill:  COLORS_PLAN[i % COLORS_PLAN.length],
  }));

  const totalTenants = por_estado.reduce((s, e) => s + e.total, 0);

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1280 }}>

      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
          <BarChart2 size={18} color={colors.accent} />
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px' }}>
            Analytics
          </h2>
        </div>
        <button
          onClick={fetchData}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: radius.md ?? 8, background: colors.cardBg, border: `1px solid ${colors.border}`, cursor: 'pointer', fontSize: 12, color: colors.textSecondary }}
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 24px 14px' }}>
        Tendencias de los últimos 12 meses · {totalTenants} tenants en total
      </p>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiCard
          label="Ingresos este mes"
          value={serie[serie.length - 1]?.ingresos ?? 0}
          prefix="$"
          color="#10b981"
          trend={kpis.crecimiento_mom}
          Icon={DollarSign}
        />
        <KpiCard
          label="Ingresos año en curso"
          value={kpis.ingreso_ytd}
          prefix="$"
          color="#6366f1"
          Icon={TrendingUp}
        />
        <KpiCard
          label="Nuevos este mes"
          value={kpis.nuevos_mes}
          suffix=" tenants"
          color="#3b82f6"
          Icon={Users}
        />
        <KpiCard
          label="Activaciones este mes"
          value={kpis.activaciones_mes}
          color="#10b981"
          Icon={TrendingUp}
        />
        <KpiCard
          label="Suspensiones este mes"
          value={kpis.suspensiones_mes}
          color="#ef4444"
          Icon={TrendingDown}
        />
      </div>

      {/* ── Fila 1: Ingresos (área) ── */}
      <div style={{ marginBottom: 20 }}>
        <ChartCard
          title="Ingresos cobrados por mes"
          subtitle="Pagos registrados en los últimos 12 meses (USD)"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={serie} margin={{ top: 4, right: 16, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colors.accent} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={colors.accent} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
              <XAxis dataKey="mes_label" tick={{ fontSize: 11, fill: colors.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: colors.textMuted }} tickFormatter={v => `$${v}`} />
              <Tooltip content={<MoneyTooltip />} />
              <Area
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke={colors.accent}
                strokeWidth={2.5}
                fill="url(#gradIngresos)"
                dot={{ r: 3, fill: colors.accent }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Fila 2: Nuevos + Actividad ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Nuevos tenants por mes */}
        <ChartCard
          title="Nuevos tenants por mes"
          subtitle="Registros en los últimos 12 meses"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
              <XAxis dataKey="mes_label" tick={{ fontSize: 10, fill: colors.textMuted }} />
              <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} allowDecimals={false} />
              <Tooltip content={<CountTooltip />} />
              <Bar dataKey="nuevos" name="Nuevos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Activaciones vs Suspensiones */}
        <ChartCard
          title="Activaciones vs Suspensiones"
          subtitle="Últimos 12 meses (desde audit_log)"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
              <XAxis dataKey="mes_label" tick={{ fontSize: 10, fill: colors.textMuted }} />
              <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} allowDecimals={false} />
              <Tooltip content={<CountTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="activaciones"  name="Activaciones"  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="suspensiones"  name="Suspensiones"  fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Fila 3: Distribuciones (Pie) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Por estado */}
        <ChartCard title="Distribución por estado" subtitle={`${totalTenants} tenants totales`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <PieChart width={180} height={180}>
              <Pie
                data={pieEstado}
                cx={85} cy={85}
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieEstado.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {pieEstado.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{e.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: e.fill }}>{e.value}</span>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>
                    ({totalTenants > 0 ? Math.round(e.value / totalTenants * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Por plan */}
        <ChartCard title="Distribución por plan" subtitle="Todos los tenants">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <PieChart width={180} height={180}>
              <Pie
                data={piePlan}
                cx={85} cy={85}
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {piePlan.map((p, i) => <Cell key={i} fill={p.fill} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {piePlan.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS_PLAN[i % COLORS_PLAN.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{p.value}</span>
                  {por_plan[i]?.precio > 0 && (
                    <span style={{ fontSize: 11, color: colors.textMuted }}>${por_plan[i].precio}/mes</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Tabla resumen por plan ── */}
      <ChartCard title="Resumen por plan de suscripción" subtitle="Total y activos confirmados">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {['Plan', 'Precio/mes', 'Total tenants', 'Activos', 'Otros', 'MRR aportado'].map(h => (
                <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: colors.textMuted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {por_plan.map((p, i) => (
              <tr key={p.plan} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS_PLAN[i % COLORS_PLAN.length] }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{p.plan}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: colors.textSecondary }}>
                  {p.precio > 0 ? `$${fmt(p.precio)}` : <span style={{ color: colors.textMuted }}>Gratis</span>}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{p.total}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#10b981', fontWeight: 600 }}>{p.activos}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: colors.textMuted }}>{p.total - p.activos}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                  {p.precio > 0 ? `$${fmt(p.activos * p.precio)}` : '—'}
                </td>
              </tr>
            ))}
            {/* Fila total */}
            <tr style={{ background: colors.mutedBg, borderTop: `2px solid ${colors.border}` }}>
              <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: colors.textPrimary }} colSpan={2}>Total</td>
              <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{por_plan.reduce((s, p) => s + p.total, 0)}</td>
              <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#10b981' }}>{por_plan.reduce((s, p) => s + p.activos, 0)}</td>
              <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: colors.textMuted }}>{por_plan.reduce((s, p) => s + (p.total - p.activos), 0)}</td>
              <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, color: '#10b981' }}>
                ${fmt(por_plan.reduce((s, p) => s + p.activos * p.precio, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}
