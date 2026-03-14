/**
 * DashboardPage.tsx — Dashboard principal SuperAdmin.
 *
 * COLORES:
 *  · UI (fondos, texto, bordes) → tokens CSS del tema (colors.ts, sin hardcode).
 *  · Estado semántico (activo/suspendido/alerta) → hex fijos como semáforos:
 *    nunca cambian con el tema porque son información, no decoración.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard,
  Users, AlertTriangle, CheckCircle, Clock, XCircle,
  UserPlus, RefreshCw, ArrowRight, Building2, Activity,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import { superAdminSvc, DashboardStats, DashboardAlerta } from '../services/superadmin.service';
import { colors, radius, shadow } from '../../styles/colors';

// ── Semantic status colors (fijos — semáforos) ────────────────────────────────
const S = {
  activo:     '#10b981',
  prueba:     '#f59e0b',
  suspendido: '#ef4444',
  vencido:    '#dc2626',
  nuevo:      '#6366f1',
  venciendo:  '#f97316',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (n: number) =>
  '$' + n.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (n: number) =>
  n >= 1000 ? '$' + Math.round(n / 1000) + 'k' : '$' + n;

const fmtDate = () =>
  new Date().toLocaleDateString('es-SV', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

const trendPct = (cur: number, prev: number): number | null =>
  prev ? Math.round(((cur - prev) / prev) * 100) : null;

// ── Primitivos ────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: colors.cardBg, borderRadius: radius.lg,
      border: `1px solid ${colors.border}`, boxShadow: shadow.card, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      {Icon && <Icon size={13} color={colors.textMuted} />}
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 1.4,
        textTransform: 'uppercase', color: colors.textMuted, whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: colors.borderLight }} />
    </div>
  );
}

function Skel({ w = '60%', h = 14 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(90deg,var(--skeleton-from,#efefef) 25%,var(--skeleton-to,#e2e2e2) 50%,var(--skeleton-from,#efefef) 75%)',
      backgroundSize: '200% 100%', animation: 'sa-shimmer 1.4s infinite',
    }} />
  );
}

// ── Tooltips para recharts ────────────────────────────────────────────────────

function PieTip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.md, padding: '10px 14px', boxShadow: shadow.modal,
    }}>
      <div style={{ fontWeight: 700, color: colors.textPrimary, fontSize: 13 }}>{payload[0].name}</div>
      <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
        {payload[0].value} clientes ({Math.round(payload[0].percent * 100)}%)
      </div>
    </div>
  );
}

function BarTip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.md, padding: '10px 14px', boxShadow: shadow.modal,
    }}>
      <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: colors.textPrimary, fontWeight: 700, fontSize: 15 }}>{fmt$(payload[0].value)}</div>
    </div>
  );
}

// ── IncomeCard ────────────────────────────────────────────────────────────────

function IncomeCard({
  label, value, color, icon: Icon, prev, muted = false,
}: {
  label: string; value: number; color?: string;
  icon: React.ElementType; prev?: number; muted?: boolean;
}) {
  const pct   = prev != null ? trendPct(value, prev) : null;
  const delta = prev != null ? value - prev : null;

  return (
    <Card style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
          color: colors.textMuted, lineHeight: 1.45, maxWidth: '75%',
        }}>
          {label}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: muted ? colors.mutedBg : `${color}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} color={muted ? colors.textMuted : color} />
        </div>
      </div>

      {/* Valor */}
      <div>
        <div style={{
          fontSize: muted ? 24 : 32, fontWeight: 800,
          color: muted ? colors.textSecondary : colors.textPrimary,
          letterSpacing: '-1.5px', lineHeight: 1,
        }}>
          {fmt$(value)}
        </div>

        {pct != null && delta != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontWeight: 700,
              color: pct >= 0 ? S.activo : S.suspendido,
              background: pct >= 0 ? `${S.activo}18` : `${S.suspendido}18`,
              borderRadius: 20, padding: '2px 8px',
            }}>
              {pct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(pct)}%
            </span>
            <span style={{ fontSize: 11, color: colors.textMuted }}>
              {delta >= 0 ? '+' : ''}{fmt$(delta)} vs mes anterior
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── CountCard ─────────────────────────────────────────────────────────────────

const COUNT_CARDS = [
  { key: 'activos'     as const, label: 'Activos',       color: S.activo,     icon: CheckCircle   },
  { key: 'en_pruebas'  as const, label: 'En prueba',     color: S.prueba,     icon: Clock         },
  { key: 'suspendidos' as const, label: 'Suspendidos',   color: S.suspendido, icon: XCircle       },
  { key: 'por_vencer'  as const, label: 'Vencen en 7d', color: S.venciendo,  icon: AlertTriangle },
  { key: 'vencidos'    as const, label: 'Vencidos',      color: S.vencido,    icon: AlertTriangle },
  { key: 'nuevos_mes'  as const, label: 'Nuevos mes',    color: S.nuevo,      icon: UserPlus      },
];

function CountCard({ label, value, color, icon: Icon, total }: {
  label: string; value: number; color: string; icon: React.ElementType; total?: number;
}) {
  const pct = total ? Math.round((value / total) * 100) : null;

  return (
    <div style={{
      background: colors.cardBg, borderRadius: radius.lg,
      border: `1px solid ${colors.border}`, boxShadow: shadow.card,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Watermark icon */}
      <div style={{
        position: 'absolute', right: -10, top: -10, opacity: 0.06, pointerEvents: 'none',
      }}>
        <Icon size={90} color={color} />
      </div>

      {/* Ícono + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: 0.7, color: colors.textMuted, lineHeight: 1.3,
        }}>
          {label}
        </span>
      </div>

      {/* Número + porcentaje */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 38, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-2px',
        }}>
          {value}
        </span>
        {pct !== null && (
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: colors.textMuted, marginBottom: 4,
          }}>
            {pct}%
          </span>
        )}
      </div>

      {/* Barra de progreso */}
      {pct !== null && (
        <div style={{ height: 3, borderRadius: 99, background: colors.borderLight }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 99,
            background: color, transition: 'width 0.6s ease',
          }} />
        </div>
      )}
    </div>
  );
}

// ── AlertaRow ─────────────────────────────────────────────────────────────────

function AlertaRow({ alerta, tipo, onVerClick }: {
  alerta: DashboardAlerta; tipo: 'por_vencer' | 'vencido';
  onVerClick: (id: number) => void;
}) {
  const isVencido = tipo === 'vencido';
  const diasLabel = isVencido
    ? `Venció hace ${alerta.dias_vencido}d`
    : `Vence en ${alerta.dias_restantes}d`;
  const badgeColor = isVencido ? S.suspendido : S.prueba;

  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto auto',
        gap: 14, padding: '12px 20px', alignItems: 'center',
        borderTop: `1px solid ${colors.borderLight}`,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Empresa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: colors.mutedBg, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={15} color={colors.textMuted} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 600, color: colors.textPrimary, fontSize: 13,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {alerta.nombre}
          </div>
          <div style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'monospace' }}>
            {alerta.slug}
          </div>
        </div>
      </div>

      {/* Plan */}
      <span style={{
        fontSize: 12, color: colors.textSecondary,
        background: colors.mutedBg, borderRadius: 20,
        padding: '3px 10px', whiteSpace: 'nowrap',
      }}>
        {alerta.plan_nombre ?? 'Sin plan'}
      </span>

      {/* Días */}
      <span style={{
        background: `${badgeColor}15`, color: badgeColor,
        border: `1px solid ${badgeColor}28`,
        borderRadius: 20, padding: '3px 10px',
        fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      }}>
        {diasLabel}
      </span>

      {/* Acción */}
      <button
        onClick={() => onVerClick(alerta.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'transparent', color: colors.accent,
          border: `1px solid ${colors.accent}`,
          borderRadius: radius.sm, padding: '5px 12px',
          fontSize: 12, cursor: 'pointer', fontWeight: 600,
        }}
      >
        Ver <ArrowRight size={11} />
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate  = useNavigate();
  const [stats,      setStats]      = useState<DashboardStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    superAdminSvc.getDashboard()
      .then(setStats).catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalAlertas =
    (stats?.alertas_vencidos?.length ?? 0) + (stats?.alertas_por_vencer?.length ?? 0);

  // Datos para gráficos
  const pieData = stats ? [
    { name: 'Activos',     value: stats.activos,     color: S.activo     },
    { name: 'En prueba',   value: stats.en_pruebas,  color: S.prueba     },
    { name: 'Suspendidos', value: stats.suspendidos, color: S.suspendido },
    { name: 'Vencidos',    value: stats.vencidos,    color: S.vencido    },
  ].filter(d => d.value > 0) : [];

  const barData = stats ? [
    { name: 'Mes anterior', value: stats.ingresos_mes_anterior, fill: `${S.activo}88` },
    { name: 'Este mes',     value: stats.ingresos_mes,          fill: 'var(--accent,#111)' },
  ] : [];

  return (
    <>
      <style>{`
        @keyframes sa-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes sa-spin    { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ padding: '32px 28px', maxWidth: 1080 }}>

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: colors.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Activity size={18} color={colors.accentText} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0, letterSpacing: '-0.4px' }}>
                Dashboard
              </h2>
            </div>
            <p style={{ color: colors.textMuted, fontSize: 12, margin: 0, paddingLeft: 46, textTransform: 'capitalize' }}>
              {stats
                ? `${stats.total} empresa${stats.total !== 1 ? 's' : ''} registradas`
                : 'Cargando...'
              } · {fmtDate()}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => loadData(true)} disabled={refreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: colors.cardBg, color: colors.textSecondary,
                border: `1px solid ${colors.border}`, borderRadius: radius.md,
                padding: '9px 16px', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', opacity: refreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? 'sa-spin 0.8s linear infinite' : 'none' }} />
              Actualizar
            </button>
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: colors.accent, color: colors.accentText,
                border: 'none', borderRadius: radius.md,
                padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
              onClick={() => navigate('/superadmin/clientes/nuevo')}
            >
              <UserPlus size={14} />
              Nuevo cliente
            </button>
          </div>
        </div>

        {/* ══ LOADING ══════════════════════════════════════════════════════════ */}
        {loading ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
              {[0,1,2].map(i => (
                <Card key={i} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Skel w="50%" h={11} />
                  <Skel w="42%" h={34} />
                  <Skel w="68%" h={10} />
                </Card>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[0,1].map(i => (
                <Card key={i} style={{ padding: '24px', height: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skel w="45%" h={12} />
                  <Skel w="100%" h={160} />
                </Card>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 14 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.border}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Skel w="58%" h={10} />
                  <Skel w="32%" h={30} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* ══ FINANCIERO ═══════════════════════════════════════════════════ */}
            <SectionLabel icon={Activity}>Resumen financiero</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
              <IncomeCard
                label="MRR — ingresos recurrentes"
                value={stats?.mrr ?? 0}
                color={S.activo}
                icon={DollarSign}
              />
              <IncomeCard
                label="Cobrado este mes"
                value={stats?.ingresos_mes ?? 0}
                color={S.nuevo}
                icon={CreditCard}
                prev={stats?.ingresos_mes_anterior}
              />
              <IncomeCard
                label="Cobrado mes anterior"
                value={stats?.ingresos_mes_anterior ?? 0}
                icon={DollarSign}
                muted
              />
            </div>

            {/* ══ GRÁFICOS ═════════════════════════════════════════════════════ */}
            <SectionLabel icon={Users}>Distribución y comparativa</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>

              {/* Donut — distribución de clientes */}
              <Card style={{ padding: '22px 24px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: colors.textPrimary, fontSize: 14 }}>
                    Distribución de clientes
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    Por estado actual
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {/* Chart */}
                  <div style={{ flexShrink: 0 }}>
                    <PieChart width={160} height={160}>
                      <Pie
                        data={pieData}
                        cx={80} cy={80}
                        innerRadius={52} outerRadius={75}
                        dataKey="value"
                        strokeWidth={0}
                        paddingAngle={pieData.length > 1 ? 3 : 0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      {/* Centro: total */}
                      <text x={80} y={76} textAnchor="middle" dominantBaseline="middle"
                        style={{ fill: colors.textPrimary, fontSize: 22, fontWeight: 800 }}>
                        {stats?.total ?? 0}
                      </text>
                      <text x={80} y={95} textAnchor="middle" dominantBaseline="middle"
                        style={{ fill: colors.textMuted, fontSize: 11 }}>
                        total
                      </text>
                      <RTooltip content={<PieTip />} />
                    </PieChart>
                  </div>

                  {/* Leyenda */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                    {pieData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{d.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{d.value}</span>
                      </div>
                    ))}
                    {pieData.length > 0 && (
                      <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: 8, marginTop: 2, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>Total</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: colors.textPrimary }}>{stats?.total ?? 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Barra — comparativa de ingresos */}
              <Card style={{ padding: '22px 24px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: colors.textPrimary, fontSize: 14 }}>
                    Comparativa de ingresos
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    Mes anterior vs este mes
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={155}>
                  <BarChart data={barData} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: colors.textMuted }}
                      axisLine={{ stroke: colors.borderLight }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: colors.textMuted }}
                      axisLine={false} tickLine={false}
                      tickFormatter={fmtCompact}
                      width={52}
                    />
                    <RTooltip content={<BarTip />} cursor={{ fill: colors.mutedBg }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* ══ CONTEOS ══════════════════════════════════════════════════════ */}
            <SectionLabel>Estado detallado</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 14, marginBottom: 28 }}>
              {COUNT_CARDS.map(({ key, label, color, icon }) => (
                <CountCard key={key} label={label} value={stats?.[key] ?? 0} color={color} icon={icon} total={stats?.total} />
              ))}
            </div>

            {/* ══ ALERTAS ══════════════════════════════════════════════════════ */}
            <SectionLabel icon={AlertTriangle}>Alertas de vencimiento</SectionLabel>

            {totalAlertas > 0 ? (
              <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
                {/* Cabecera alerta */}
                <div style={{
                  padding: '14px 20px',
                  background: `${S.suspendido}0d`,
                  borderBottom: `1px solid ${S.suspendido}22`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${S.suspendido}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle size={14} color={S.suspendido} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: S.suspendido }}>
                    Atención requerida
                  </span>
                  <span style={{
                    background: S.suspendido, color: '#fff',
                    borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
                  }}>
                    {totalAlertas}
                  </span>
                </div>

                {/* Vencidos */}
                {stats!.alertas_vencidos.length > 0 && (
                  <>
                    <div style={{
                      padding: '7px 20px', background: colors.mutedBg,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <XCircle size={11} color={S.suspendido} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: S.suspendido, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                        Pago vencido — suspensión pendiente
                      </span>
                    </div>
                    {stats!.alertas_vencidos.map(a => (
                      <AlertaRow key={a.id} alerta={a} tipo="vencido"
                        onVerClick={id => navigate(`/superadmin/clientes/${id}`)} />
                    ))}
                  </>
                )}

                {/* Por vencer */}
                {stats!.alertas_por_vencer.length > 0 && (
                  <>
                    <div style={{
                      padding: '7px 20px', background: colors.mutedBg,
                      borderTop: `1px solid ${colors.border}`,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Clock size={11} color={S.prueba} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: S.prueba, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                        Próximos a vencer (7 días)
                      </span>
                    </div>
                    {stats!.alertas_por_vencer.map(a => (
                      <AlertaRow key={a.id} alerta={a} tipo="por_vencer"
                        onVerClick={id => navigate(`/superadmin/clientes/${id}`)} />
                    ))}
                  </>
                )}
              </Card>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: `${S.activo}0d`,
                border: `1px solid ${S.activo}28`,
                borderRadius: radius.lg, padding: '14px 20px', marginBottom: 24,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `${S.activo}18`, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle size={16} color={S.activo} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: S.activo }}>Todo al día</div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                    Ningún cliente con pagos vencidos o próximos a vencer
                  </div>
                </div>
              </div>
            )}

            {/* ══ ACCIONES ═════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'transparent', color: colors.accent,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md, padding: '9px 18px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = colors.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}
                onClick={() => navigate('/superadmin/clientes')}
              >
                <Users size={14} />
                Ver todos los clientes
                <ArrowRight size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
