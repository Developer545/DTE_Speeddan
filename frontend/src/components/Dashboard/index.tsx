/**
 * Dashboard/index.tsx — Dashboard ERP con KPIs reales y gráficas recharts.
 *
 * Secciones:
 *   1. Banner de bienvenida (personalizado, fecha real)
 *   2. KPI cards (4): ventas mes, ventas hoy, facturas pendientes, valor inventario
 *   3. Fila de alertas: sin stock, lotes por vencer, compras del mes
 *   4. Gráfica: Ventas por día (AreaChart 30 días) + Top 5 Productos (BarChart)
 *   5. Gráfica: Distribución por tipo DTE (PieChart) + Actividad reciente
 *   6. Tarjetas de acceso rápido a módulos (con conteos reales)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, FileText, Package,
  AlertTriangle, Clock, ShoppingCart, Users, Box, Receipt,
  Calculator, RefreshCw, ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow } from '../../styles/colors';
import * as svc from '../../services/dashboard.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}
function pctChange(current: number, previous: number): { pct: string; up: boolean; neutral: boolean } {
  if (previous === 0) return { pct: 'N/A', up: true, neutral: true };
  const diff = ((current - previous) / previous) * 100;
  return { pct: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`, up: diff >= 0, neutral: false };
}
function labelFecha(fecha: string): string {
  // "2026-02-15" → "15/02"
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 24, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'var(--skeleton-from, #efefef)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:    string;
  value:    string;
  sub?:     string;
  change?:  { pct: string; up: boolean; neutral: boolean };
  color:    string;
  icon:     React.ReactNode;
  loading:  boolean;
  warning?: boolean;
}

function KpiCard({ label, value, sub, change, color, icon, loading, warning }: KpiCardProps) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${warning ? 'rgba(245,158,11,0.3)' : colors.border}`,
      borderRadius: radius.lg, padding: '22px 24px', boxShadow: shadow.card,
      borderTop: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: `${color}18`,
        }}>
          {icon}
        </div>
        {change && !change.neutral && !loading && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
            background: change.up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: change.up ? '#059669' : '#dc2626',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {change.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {change.pct}
          </span>
        )}
      </div>
      {loading ? (
        <><Skeleton h={28} /><Skeleton h={14} w="60%" /></>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            {value}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </div>
          {sub && <div style={{ fontSize: 11, color: colors.textMuted }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

// ── Alert badge ───────────────────────────────────────────────────────────────

function AlertBadge({ icon, label, value, color, onClick }: {
  icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void;
}) {
  if (value === 0) return null;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        background: `${color}12`, border: `1px solid ${color}30`,
        borderRadius: radius.md, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {icon}
      <span style={{ fontSize: 13, fontWeight: 600, color }}>
        {value} {label}
      </span>
    </div>
  );
}

// ── Tooltip custom para recharts ──────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.sm, padding: '8px 12px', boxShadow: shadow.hover,
      fontSize: 12,
    }}>
      <div style={{ color: colors.textMuted, marginBottom: 2 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ fontWeight: 700, color: colors.textPrimary }}>
          {fmt(p.value)}
        </div>
      ))}
    </div>
  );
}

function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.sm, padding: '8px 12px', boxShadow: shadow.hover, fontSize: 12,
    }}>
      <div style={{ color: colors.textMuted, marginBottom: 2 }}>{payload[0]?.payload?.nombre}</div>
      <div style={{ fontWeight: 700, color: colors.textPrimary }}>{fmt(payload[0]?.value)}</div>
    </div>
  );
}

// Colores para PieChart
const PIE_COLORS = ['#111111', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

// ── Sección card wrapper ──────────────────────────────────────────────────────

function ChartCard({ title, icon, children, style }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden', ...style,
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ── Módulos de acceso rápido ──────────────────────────────────────────────────

interface QuickModule {
  id: string; title: string; desc: string;
  icon: React.ReactNode; color: string; route: string; stat: string;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardModule() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [data,    setData]    = useState<svc.DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const firstName = (authUser?.nombre ?? 'Usuario').split(' ')[0];
  const hora      = new Date().getHours();
  const saludo    = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const hoy       = new Date().toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await svc.getDashboard());
    } catch {
      setError('No se pudo cargar el dashboard. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const kpis   = data?.kpis;
  const mcounts = data?.modulo_counts;
  const cambioMes = kpis ? pctChange(kpis.ventas_mes, kpis.ventas_mes_anterior) : null;

  // Truncar nombre de producto para el eje Y del BarChart
  function truncate(s: string, n = 18) { return s.length > n ? s.slice(0, n) + '…' : s; }

  const quickModules: QuickModule[] = [
    {
      id: 'pos', title: 'Punto de Venta', desc: 'Registrar ventas',
      icon: <ShoppingCart size={26} color="white" />, color: '#10b981', route: '/pos',
      stat: mcounts ? `${mcounts.facturas_pendientes} pendientes` : '—',
    },
    {
      id: 'inventory', title: 'Inventario', desc: 'Stock y kardex',
      icon: <Box size={26} color="white" />, color: '#3b82f6', route: '/inventario',
      stat: mcounts ? `${mcounts.total_productos} productos` : '—',
    },
    {
      id: 'purchases', title: 'Compras', desc: 'Órdenes de compra',
      icon: <Receipt size={26} color="white" />, color: '#8b5cf6', route: '/compras',
      stat: mcounts ? `${mcounts.compras_mes} este mes` : '—',
    },
    {
      id: 'costing', title: 'Costeo', desc: 'Fletes y aranceles',
      icon: <Calculator size={26} color="white" />, color: '#f59e0b', route: '/costeo',
      stat: '—',
    },
    {
      id: 'customers', title: 'Clientes', desc: 'Gestión de cuentas',
      icon: <Users size={26} color="white" />, color: '#06b6d4', route: '/clientes',
      stat: mcounts ? `${mcounts.total_clientes} registrados` : '—',
    },
    {
      id: 'invoicing', title: 'Facturación', desc: 'Generar y enviar DTE',
      icon: <FileText size={26} color="white" />, color: '#ec4899', route: '/facturacion',
      stat: mcounts ? `${mcounts.facturas_pendientes} pendientes` : '—',
    },
  ];

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* ── Banner de bienvenida ── */}
      <div style={{
        background: 'var(--accent, #111111)', borderRadius: radius.xl,
        padding: '36px 44px', marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -50, right: -50, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: '40%', width: 140, height: 140,
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-text, #fff)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              {saludo}, {firstName}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>
              {hoy} — aquí tienes el resumen del negocio
            </div>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: radius.md,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`,
          borderRadius: radius.md, padding: '12px 16px', marginBottom: 20,
          fontSize: 13, color: colors.dangerText, fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {/* ── KPI Cards (4) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <KpiCard
          label="Ventas del mes"
          value={loading ? '—' : fmtK(kpis!.ventas_mes)}
          sub={loading ? undefined : `Mes anterior: ${fmtK(kpis!.ventas_mes_anterior)}`}
          change={cambioMes ?? undefined}
          color="#10b981"
          icon={<TrendingUp size={18} color="#10b981" />}
          loading={loading}
        />
        <KpiCard
          label="Ventas de hoy"
          value={loading ? '—' : fmtK(kpis!.ventas_hoy)}
          color="#3b82f6"
          icon={<DollarSign size={18} color="#3b82f6" />}
          loading={loading}
        />
        <KpiCard
          label="Facturas pendientes"
          value={loading ? '—' : String(kpis!.facturas_borrador)}
          sub="en borrador"
          color={kpis && kpis.facturas_borrador > 0 ? '#f59e0b' : '#10b981'}
          icon={<FileText size={18} color={kpis && kpis.facturas_borrador > 0 ? '#f59e0b' : '#10b981'} />}
          loading={loading}
          warning={kpis && kpis.facturas_borrador > 0}
        />
        <KpiCard
          label="Valor inventario"
          value={loading ? '—' : fmtK(kpis!.valor_inventario)}
          sub={loading ? undefined : `${kpis!.total_clientes} clientes activos`}
          color="#8b5cf6"
          icon={<Package size={18} color="#8b5cf6" />}
          loading={loading}
        />
      </div>

      {/* ── Alertas rápidas (sin stock / por vencer / compras) ── */}
      {!loading && kpis && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <AlertBadge
            icon={<AlertTriangle size={14} color="#dc2626" />}
            label="productos sin stock"
            value={kpis.productos_sin_stock}
            color="#dc2626"
            onClick={() => navigate('/inventario')}
          />
          <AlertBadge
            icon={<Clock size={14} color="#d97706" />}
            label="lotes por vencer (30 días)"
            value={kpis.lotes_por_vencer}
            color="#d97706"
            onClick={() => navigate('/inventario')}
          />
          <AlertBadge
            icon={<ShoppingCart size={14} color="#7c3aed" />}
            label={`compras este mes — ${fmt(kpis.compras_mes)}`}
            value={kpis.compras_mes > 0 ? 1 : 0}  /* solo muestra si hay compras */
            color="#7c3aed"
          />
        </div>
      )}

      {/* ── Fila 1 de gráficas: Area chart + Top productos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>

        {/* Ventas por día */}
        <ChartCard
          title="Ventas — últimos 30 días"
          icon={<TrendingUp size={15} color="#10b981" />}
        >
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton w="100%" h={200} r={8} />
            </div>
          ) : data!.ventas_por_dia.every(d => d.total === 0) ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 13 }}>
              Sin ventas en los últimos 30 días
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data!.ventas_por_dia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e5e5)" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={labelFecha}
                  tick={{ fontSize: 10, fill: 'var(--text-muted, #9b9b9b)' }}
                  axisLine={false} tickLine={false}
                  interval={4}
                />
                <YAxis
                  tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'K' : v}`}
                  tick={{ fontSize: 10, fill: 'var(--text-muted, #9b9b9b)' }}
                  axisLine={false} tickLine={false} width={48}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="total"
                  stroke="#10b981" strokeWidth={2}
                  fill="url(#gradVentas)"
                  dot={false} activeDot={{ r: 4, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top 5 productos */}
        <ChartCard
          title="Top 5 productos del mes"
          icon={<Package size={15} color="#3b82f6" />}
        >
          {loading ? (
            <div style={{ height: 220 }}><Skeleton w="100%" h={200} r={8} /></div>
          ) : data!.top_productos.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 13 }}>
              Sin ventas registradas este mes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data!.top_productos.map(p => ({ ...p, label: truncate(p.nombre) }))}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e5e5)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'K' : v}`}
                  tick={{ fontSize: 9, fill: 'var(--text-muted, #9b9b9b)' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  type="category" dataKey="label" width={90}
                  tick={{ fontSize: 10, fill: 'var(--text-secondary, #444)' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Fila 2: Pie chart + Actividad reciente ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16, marginBottom: 24 }}>

        {/* Pie chart por tipo DTE */}
        <ChartCard
          title="Ventas por tipo DTE"
          icon={<FileText size={15} color="#8b5cf6" />}
        >
          {loading ? (
            <div style={{ height: 240 }}><Skeleton w="100%" h={220} r={8} /></div>
          ) : data!.ventas_por_tipo.length === 0 ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 13 }}>
              Sin datos este mes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data!.ventas_por_tipo}
                  dataKey="total"
                  nameKey="tipo_dte"
                  cx="50%" cy="45%"
                  outerRadius={80}
                  innerRadius={46}
                  paddingAngle={3}
                >
                  {data!.ventas_por_tipo.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => fmt(Number(v))}
                  contentStyle={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: colors.textSecondary }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Actividad reciente */}
        <ChartCard
          title="Actividad reciente"
          icon={<Clock size={15} color={colors.accent} />}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} h={44} r={8} />)}
            </div>
          ) : data!.actividad_reciente.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
              No hay actividad reciente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data!.actividad_reciente.map((item, i) => {
                const esFactura = item.tipo === 'factura';
                const badgeColor = esFactura
                  ? (item.estado === 'facturado' ? '#059669' : item.estado === 'borrador' ? '#d97706' : '#dc2626')
                  : '#7c3aed';
                const badgeBg = esFactura
                  ? (item.estado === 'facturado' ? 'rgba(16,185,129,0.1)' : item.estado === 'borrador' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)')
                  : 'rgba(124,58,237,0.1)';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: radius.sm,
                    background: i % 2 === 0 ? 'transparent' : colors.inputBg,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: esFactura ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {esFactura
                        ? <FileText size={15} color="#059669" />
                        : <ShoppingCart size={15} color="#7c3aed" />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary, fontFamily: 'monospace' }}>
                        {item.referencia}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>{item.fecha}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                        {fmt(item.total)}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px',
                        borderRadius: 10, background: badgeBg, color: badgeColor,
                        textTransform: 'capitalize',
                      }}>
                        {item.estado}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

      </div>

      {/* ── Acceso rápido a módulos ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, marginBottom: 14, letterSpacing: '-0.2px' }}>
          Acceso rápido
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {quickModules.map(m => (
            <div
              key={m.id}
              onClick={() => navigate(m.route)}
              style={{
                background: colors.cardBg, border: `1px solid ${colors.border}`,
                borderRadius: radius.lg, padding: '20px 22px', cursor: 'pointer',
                boxShadow: shadow.card, transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = shadow.hover;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = shadow.card;
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${m.color} 0%, ${m.color}cc 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${m.color}30`,
              }}>
                {m.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, marginBottom: 2 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>{m.stat}</div>
              </div>
              <ArrowUpRight size={14} color={colors.textMuted} />
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe para spinner (inline) */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
