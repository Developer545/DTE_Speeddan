/**
 * ClientesPage.tsx — Lista de todos los tenants (clientes del SaaS).
 * Diseño mejorado con KPIs, filtros por estado y tabla enriquecida.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, CheckCircle2, FlaskConical, Ban, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { superAdminSvc, TenantListItem, TenantEstado } from '../services/superadmin.service';
import { colors, radius, shadow } from '../../styles/colors';

// ── Configuración visual por estado ───────────────────────────────────────────

const ESTADO_CONFIG: Record<TenantEstado, {
  label: string; bg: string; color: string; dot: string; border: string;
}> = {
  activo:     { label: 'Activo',     bg: 'rgba(16,185,129,0.10)', color: '#065f46', dot: '#10b981', border: 'rgba(16,185,129,0.25)' },
  pruebas:    { label: 'Pruebas',    bg: 'rgba(245,158,11,0.10)',  color: '#92400e', dot: '#f59e0b', border: 'rgba(245,158,11,0.25)'  },
  suspendido: { label: 'Suspendido', bg: 'rgba(239,68,68,0.10)',   color: '#991b1b', dot: '#ef4444', border: 'rgba(239,68,68,0.25)'  },
};

type FiltroEstado = 'todos' | TenantEstado;

// ── Sub-componentes ────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: TenantEstado }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: '3px 10px',
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function DiasVencer({ dias }: { dias: number | null }) {
  if (dias === null) return <span style={{ color: colors.textMuted, fontSize: 13 }}>Sin fecha</span>;
  if (dias < 0) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700, fontSize: 13 }}>
      <Clock size={12} />
      Vencido hace {Math.abs(dias)}d
    </span>
  );
  if (dias === 0) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700, fontSize: 13 }}>
      <Clock size={12} />
      Vence hoy
    </span>
  );
  if (dias <= 3) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ea580c', fontWeight: 600, fontSize: 13 }}>
      <Clock size={12} />
      {dias}d
    </span>
  );
  if (dias <= 7) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#d97706', fontWeight: 600, fontSize: 13 }}>
      <Clock size={12} />
      {dias}d
    </span>
  );
  return <span style={{ color: colors.textSecondary, fontSize: 13 }}>{dias}d</span>;
}

function CompanyAvatar({ nombre }: { nombre: string }) {
  const initials = nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: `linear-gradient(135deg, var(--accent, #111111) 0%, color-mix(in srgb, var(--accent, #111111) 70%, #6366f1) 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color: 'var(--accent-text, #fff)', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
        {initials || '?'}
      </span>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
  active?: boolean;
  onClick?: () => void;
}

function KpiCard({ icon, label, value, color, bg, border, active, onClick }: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 0', minWidth: 120,
        background: active ? bg : colors.cardBg,
        border: `1.5px solid ${active ? border : colors.border}`,
        borderRadius: radius.lg,
        padding: '16px 18px',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'all 0.15s ease',
        boxShadow: active ? `0 0 0 3px ${border}` : shadow.card,
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {active && (
          <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: 10, border: `1px solid ${border}` }}>
            FILTRO
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: active ? color : colors.textPrimary, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: active ? color : colors.textMuted, marginTop: 4, fontWeight: 500 }}>
        {label}
      </div>
    </button>
  );
}

// ── Skeleton row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 70px',
      padding: '14px 20px', borderBottom: `1px solid ${colors.borderLight}`,
      gap: 16, alignItems: 'center',
    }}>
      {[220, 80, 70, 90, 70, 50].map((w, i) => (
        <div key={i} style={{
          height: 14, width: w, borderRadius: 6,
          background: 'var(--skeleton-from, #efefef)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ClientesPage() {
  const navigate              = useNavigate();
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [search,  setSearch]  = useState('');
  const [filtro,  setFiltro]  = useState<FiltroEstado>('todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarTenants = (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    superAdminSvc.getTenants()
      .then(setTenants)
      .catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { cargarTenants(); }, []);

  // KPIs
  const kpis = useMemo(() => ({
    total:      tenants.length,
    activos:    tenants.filter(t => t.estado === 'activo').length,
    pruebas:    tenants.filter(t => t.estado === 'pruebas').length,
    suspendidos: tenants.filter(t => t.estado === 'suspendido').length,
  }), [tenants]);

  // Filtrado
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tenants.filter(t => {
      const matchSearch = !q
        || t.nombre.toLowerCase().includes(q)
        || t.slug.toLowerCase().includes(q)
        || (t.plan_nombre ?? '').toLowerCase().includes(q)
        || (t.email_contacto ?? '').toLowerCase().includes(q);
      const matchFiltro = filtro === 'todos' || t.estado === filtro;
      return matchSearch && matchFiltro;
    });
  }, [tenants, search, filtro]);

  return (
    <div style={{ padding: '28px 28px 40px', minHeight: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, borderRadius: 4, background: colors.accent }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0, letterSpacing: '-0.4px' }}>
              Clientes
            </h2>
          </div>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 0 14px' }}>
            {kpis.total} empresa{kpis.total !== 1 ? 's' : ''} registrada{kpis.total !== 1 ? 's' : ''} en el sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => cargarTenants(true)}
            title="Actualizar"
            style={{
              background: colors.cardBg, color: colors.textSecondary,
              border: `1px solid ${colors.border}`, borderRadius: radius.md,
              padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
          <button
            style={{
              background: colors.accent, color: colors.accentText,
              border: 'none', borderRadius: radius.md,
              padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'opacity 0.15s',
            }}
            onClick={() => navigate('/superadmin/clientes/nuevo')}
          >
            <Plus size={15} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <KpiCard
          icon={<Building2 size={16} />}
          label="Total clientes"
          value={kpis.total}
          color={colors.accent}
          bg={`rgba(0,0,0,0.05)`}
          border={colors.border}
          active={filtro === 'todos'}
          onClick={() => setFiltro('todos')}
        />
        <KpiCard
          icon={<CheckCircle2 size={16} />}
          label="Activos"
          value={kpis.activos}
          color="#065f46"
          bg="rgba(16,185,129,0.10)"
          border="rgba(16,185,129,0.25)"
          active={filtro === 'activo'}
          onClick={() => setFiltro('activo')}
        />
        <KpiCard
          icon={<FlaskConical size={16} />}
          label="En pruebas"
          value={kpis.pruebas}
          color="#92400e"
          bg="rgba(245,158,11,0.10)"
          border="rgba(245,158,11,0.25)"
          active={filtro === 'pruebas'}
          onClick={() => setFiltro('pruebas')}
        />
        <KpiCard
          icon={<Ban size={16} />}
          label="Suspendidos"
          value={kpis.suspendidos}
          color="#991b1b"
          bg="rgba(239,68,68,0.10)"
          border="rgba(239,68,68,0.25)"
          active={filtro === 'suspendido'}
          onClick={() => setFiltro('suspendido')}
        />
      </div>

      {/* ── Barra de búsqueda ──────────────────────────────────────────────── */}
      <div style={{
        background: colors.cardBg, border: `1px solid ${colors.border}`,
        borderRadius: radius.lg, padding: '14px 18px',
        marginBottom: 16, boxShadow: shadow.card,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Search size={16} color={colors.textMuted} style={{ flexShrink: 0 }} />
        <input
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: colors.textPrimary, fontSize: 14,
          }}
          placeholder="Buscar por nombre, código, plan o correo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textMuted, fontSize: 18, lineHeight: 1, padding: '0 4px',
            }}
          >×</button>
        )}
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: colors.mutedBg, color: colors.textMuted, whiteSpace: 'nowrap',
        }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Tabla ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: colors.cardBg, borderRadius: radius.lg,
        border: `1px solid ${colors.border}`, boxShadow: shadow.card,
        overflow: 'hidden',
      }}>

        {/* Cabecera */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 70px',
          padding: '11px 20px',
          background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
          borderBottom: `1px solid ${colors.border}`,
          gap: 16,
        }}>
          {['Empresa', 'Código', 'Plan', 'Estado', 'Vence en', ''].map((h, i) => (
            <span key={i} style={{
              color: colors.textMuted, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Contenido */}
        {loading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: colors.mutedBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Building2 size={24} color={colors.textMuted} />
            </div>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
              {search || filtro !== 'todos'
                ? 'No hay clientes que coincidan con los filtros'
                : 'Aún no hay clientes registrados'}
            </p>
            {(search || filtro !== 'todos') && (
              <button
                onClick={() => { setSearch(''); setFiltro('todos'); }}
                style={{
                  marginTop: 12, background: 'none', border: `1px solid ${colors.border}`,
                  borderRadius: radius.md, padding: '7px 16px', fontSize: 13,
                  color: colors.textSecondary, cursor: 'pointer',
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          filtered.map((t, idx) => (
            <TenantRow
              key={t.id}
              tenant={t}
              isLast={idx === filtered.length - 1}
              onClick={() => navigate(`/superadmin/clientes/${t.id}`)}
            />
          ))
        )}
      </div>

      {/* Animaciones */}
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes spin   { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

// ── Fila de tenant ─────────────────────────────────────────────────────────────

function TenantRow({
  tenant: t, isLast, onClick,
}: {
  tenant: TenantListItem; isLast: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const venceUrgente = t.dias_para_vencer !== null && t.dias_para_vencer <= 7;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 70px',
        padding: '13px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${colors.borderLight}`,
        alignItems: 'center', gap: 16,
        cursor: 'pointer',
        background: hovered ? colors.rowHover : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {/* Empresa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, overflow: 'hidden' }}>
        <CompanyAvatar nombre={t.nombre} />
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            color: colors.textPrimary, fontWeight: 700, fontSize: 14,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {t.nombre}
          </div>
          {t.email_contacto && (
            <div style={{
              color: colors.textMuted, fontSize: 12,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {t.email_contacto}
            </div>
          )}
        </div>
      </div>

      {/* Código */}
      <span style={{
        color: colors.accent, fontFamily: 'monospace', fontSize: 12,
        background: 'rgba(0,0,0,0.04)', border: `1px solid ${colors.borderLight}`,
        borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap',
        display: 'inline-block',
      }}>
        {t.slug}
      </span>

      {/* Plan */}
      <span style={{
        color: t.plan_nombre ? colors.textSecondary : colors.textMuted,
        fontSize: 13, fontWeight: t.plan_nombre ? 500 : 400,
      }}>
        {t.plan_nombre ?? 'Sin plan'}
      </span>

      {/* Estado */}
      <EstadoBadge estado={t.estado} />

      {/* Vence en */}
      <div style={{
        padding: venceUrgente ? '3px 0' : 0,
      }}>
        <DiasVencer dias={t.dias_para_vencer} />
      </div>

      {/* Acción */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: hovered ? colors.accent : colors.mutedBg,
          color: hovered ? colors.accentText : colors.textMuted,
          transition: 'all 0.15s',
        }}>
          <ChevronRight size={15} />
        </div>
      </div>
    </div>
  );
}
