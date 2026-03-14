/**
 * AuditoriaPage.tsx — Visor de audit_log para el SuperAdmin.
 * Muestra todas las acciones registradas con filtros y paginación.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw, User, Cpu,
} from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { auditService, AuditItem, AuditFilters } from '../services/superadmin.service';

const LIMIT = 50;

// ── Mapeo de acciones a etiquetas legibles ────────────────────────────────────

const ACCION_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  login_superadmin:   { label: 'Login',            bg: '#eff6ff', color: '#1d4ed8' },
  logout_superadmin:  { label: 'Logout',           bg: '#f5f3ff', color: '#6d28d9' },
  crear_tenant:       { label: 'Crear tenant',     bg: '#f0fdf4', color: '#15803d' },
  actualizar_tenant:  { label: 'Actualizar tenant',bg: '#fefce8', color: '#92400e' },
  suspender_tenant:   { label: 'Suspender tenant', bg: '#fef2f2', color: '#b91c1c' },
  activar_tenant:     { label: 'Activar tenant',   bg: '#f0fdf4', color: '#15803d' },
  registrar_pago:     { label: 'Pago',             bg: '#f0fdf4', color: '#15803d' },
  crear_usuario:      { label: 'Crear usuario',    bg: '#eff6ff', color: '#1d4ed8' },
  actualizar_usuario: { label: 'Actualizar usuario',bg: '#fefce8', color: '#92400e' },
  eliminar_usuario:   { label: 'Eliminar usuario', bg: '#fef2f2', color: '#b91c1c' },
  reset_password:     { label: 'Reset contraseña', bg: '#fff7ed', color: '#c2410c' },
  impersonar_tenant:  { label: 'Impersonar',       bg: '#fdf4ff', color: '#7e22ce' },
  crear_sucursal:     { label: 'Crear sucursal',   bg: '#eff6ff', color: '#1d4ed8' },
  actualizar_dte:     { label: 'Actualizar DTE',   bg: '#fefce8', color: '#92400e' },
};

function AccionBadge({ accion }: { accion: string }) {
  const cfg = ACCION_LABEL[accion] ?? { label: accion, bg: colors.mutedBg, color: colors.textSecondary };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

function ActorBadge({ tipo }: { tipo: 'superadmin' | 'sistema' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: tipo === 'superadmin' ? '#eff6ff' : '#f5f5f5',
      color:      tipo === 'superadmin' ? '#1d4ed8' : '#6b7280',
    }}>
      {tipo === 'superadmin' ? <User size={10} /> : <Cpu size={10} />}
      {tipo}
    </span>
  );
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-SV', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Fila expandible ───────────────────────────────────────────────────────────

function AuditRow({ item }: { item: AuditItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetalle = item.detalle && Object.keys(item.detalle).length > 0;

  return (
    <>
      <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
        {/* Fecha */}
        <td style={{ padding: '10px 12px', fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap' }}>
          {fmtFecha(item.created_at)}
        </td>
        {/* Actor */}
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ActorBadge tipo={item.actor_tipo} />
            {item.actor_nombre && (
              <span style={{ fontSize: 11, color: colors.textSecondary }}>
                {item.actor_nombre}
              </span>
            )}
            {item.actor_tipo === 'sistema' && !item.actor_nombre && (
              <span style={{ fontSize: 11, color: colors.textMuted }}>sistema automático</span>
            )}
          </div>
        </td>
        {/* Acción */}
        <td style={{ padding: '10px 12px' }}>
          <AccionBadge accion={item.accion} />
        </td>
        {/* Tenant */}
        <td style={{ padding: '10px 12px', fontSize: 12 }}>
          {item.tenant_nombre
            ? (
              <div>
                <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{item.tenant_nombre}</span>
                <span style={{ color: colors.textMuted, marginLeft: 4 }}>/{item.tenant_slug}</span>
              </div>
            )
            : <span style={{ color: colors.textMuted }}>—</span>
          }
        </td>
        {/* IP */}
        <td style={{ padding: '10px 12px', fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' }}>
          {item.ip ?? '—'}
        </td>
        {/* Detalle */}
        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
          {hasDetalle
            ? (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: colors.mutedBg, border: `1px solid ${colors.border}`,
                  color: colors.textSecondary, cursor: 'pointer',
                }}
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Ocultar' : 'Ver'}
              </button>
            )
            : <span style={{ color: colors.textMuted, fontSize: 12 }}>—</span>
          }
        </td>
      </tr>

      {/* Fila expandida con JSON del detalle */}
      {expanded && hasDetalle && (
        <tr style={{ background: colors.mutedBg }}>
          <td colSpan={6} style={{ padding: '10px 20px 14px 20px' }}>
            <pre style={{
              margin: 0, fontSize: 11.5,
              background: '#1e1e2e', color: '#cdd6f4',
              padding: '12px 16px', borderRadius: 8, overflowX: 'auto',
              lineHeight: 1.6, maxHeight: 280,
            }}>
              {JSON.stringify(item.detalle, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const ACCION_OPTIONS = [
  { value: '',                    label: 'Todas las acciones'    },
  { value: 'login_superadmin',    label: 'Login'                 },
  { value: 'logout_superadmin',   label: 'Logout'                },
  { value: 'crear_tenant',        label: 'Crear tenant'          },
  { value: 'actualizar_tenant',   label: 'Actualizar tenant'     },
  { value: 'suspender_tenant',    label: 'Suspender tenant'      },
  { value: 'activar_tenant',      label: 'Activar tenant'        },
  { value: 'registrar_pago',      label: 'Registrar pago'        },
  { value: 'crear_usuario',       label: 'Crear usuario'         },
  { value: 'actualizar_usuario',  label: 'Actualizar usuario'    },
  { value: 'eliminar_usuario',    label: 'Eliminar usuario'      },
  { value: 'reset_password',      label: 'Reset contraseña'      },
  { value: 'impersonar_tenant',   label: 'Impersonar tenant'     },
  { value: 'crear_sucursal',      label: 'Crear sucursal'        },
  { value: 'actualizar_dte',      label: 'Actualizar DTE'        },
];

export default function AuditoriaPage() {
  const [items,   setItems]   = useState<AuditItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Filtros
  const [accion,      setAccion]      = useState('');
  const [actorTipo,   setActorTipo]   = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin,    setFechaFin]    = useState('');

  const fetchData = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const filters: AuditFilters = { page: p, limit: LIMIT };
      if (accion)      filters.accion      = accion;
      if (actorTipo)   filters.actor_tipo  = actorTipo;
      if (fechaInicio) filters.fecha_inicio = fechaInicio;
      if (fechaFin)    filters.fecha_fin   = fechaFin;
      const data = await auditService.get(filters);
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, accion, actorTipo, fechaInicio, fechaFin]);

  useEffect(() => { fetchData(page); }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    fetchData(1);
  };

  const handleReset = () => {
    setAccion('');
    setActorTipo('');
    setFechaInicio('');
    setFechaFin('');
    setPage(1);
  };

  const goPage = (p: number) => {
    setPage(p);
    fetchData(p);
  };

  // ── estilos de input compartidos ──────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    padding: '7px 11px', borderRadius: radius.md ?? 8, fontSize: 13,
    border: `1px solid ${colors.border}`, background: colors.cardBg,
    color: colors.textPrimary, outline: 'none',
  };

  return (
    <div style={{ padding: '32px 28px' }}>

      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
        <Shield size={18} color={colors.accent} />
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px' }}>
          Auditoría
        </h2>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 24px 14px' }}>
        {total} registro{total !== 1 ? 's' : ''} en el historial de acciones
      </p>

      {/* ── Filtros ── */}
      <div style={{
        background: colors.cardBg, border: `1px solid ${colors.border}`,
        borderRadius: radius.lg ?? 12, boxShadow: shadow.card,
        padding: '16px 20px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Filter size={14} color={colors.textSecondary} />
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Filtros
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          {/* Acción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>Acción</label>
            <select value={accion} onChange={e => setAccion(e.target.value)} style={{ ...inputStyle, minWidth: 180 }}>
              {ACCION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Actor tipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>Actor</label>
            <select value={actorTipo} onChange={e => setActorTipo(e.target.value)} style={{ ...inputStyle, minWidth: 140 }}>
              <option value="">Todos</option>
              <option value="superadmin">SuperAdmin</option>
              <option value="sistema">Sistema</option>
            </select>
          </div>

          {/* Fecha inicio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>Desde</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
          </div>

          {/* Fecha fin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 1 }}>
            <button
              onClick={handleSearch}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: radius.md ?? 8,
                background: colors.accent, color: colors.accentText,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <Search size={13} />
              Buscar
            </button>
            <button
              onClick={handleReset}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: radius.md ?? 8,
                background: colors.cardBg, color: colors.textSecondary,
                border: `1px solid ${colors.border}`, cursor: 'pointer', fontSize: 13,
              }}
            >
              <RefreshCw size={12} />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div style={{
        background: colors.cardBg, border: `1px solid ${colors.border}`,
        borderRadius: radius.lg ?? 12, boxShadow: shadow.card,
        overflow: 'hidden',
      }}>
        {error && (
          <div style={{ padding: '16px 20px', color: '#dc2626', fontSize: 13, borderBottom: `1px solid ${colors.border}` }}>
            Error: {error}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.mutedBg, borderBottom: `1px solid ${colors.border}` }}>
                {['Fecha', 'Actor', 'Acción', 'Tenant', 'IP', 'Detalle'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', fontSize: 11, fontWeight: 600,
                    color: colors.textSecondary, textAlign: 'left',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    {Array.from({ length: 6 }, (__, j) => (
                      <td key={j} style={{ padding: '12px' }}>
                        <div style={{
                          height: 14, borderRadius: 4, background: colors.mutedBg,
                          width: j === 0 ? 130 : j === 1 ? 90 : j === 2 ? 110 : j === 3 ? 120 : 70,
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                      </td>
                    ))}
                  </tr>
                ))
                : items.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>
                        No hay registros con los filtros seleccionados.
                      </td>
                    </tr>
                  )
                  : items.map(item => <AuditRow key={item.id} item={item} />)
              }
            </tbody>
          </table>
        </div>

        {/* ── Paginación ── */}
        {!loading && pages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderTop: `1px solid ${colors.border}`,
          }}>
            <span style={{ fontSize: 12, color: colors.textMuted }}>
              Página {page} de {pages} — {total} registros
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => goPage(page - 1)}
                disabled={page <= 1}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: radius.md ?? 8,
                  background: colors.cardBg, border: `1px solid ${colors.border}`,
                  color: page <= 1 ? colors.textMuted : colors.textSecondary,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13,
                }}
              >
                <ChevronLeft size={14} /> Anterior
              </button>

              {/* Páginas numéricas — mostrar hasta 5 alrededor de la actual */}
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => goPage(p)}
                    style={{
                      width: 34, height: 34, borderRadius: radius.md ?? 8,
                      background: p === page ? colors.accent : colors.cardBg,
                      color:      p === page ? colors.accentText : colors.textSecondary,
                      border:     p === page ? 'none' : `1px solid ${colors.border}`,
                      cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 700 : 400,
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => goPage(page + 1)}
                disabled={page >= pages}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: radius.md ?? 8,
                  background: colors.cardBg, border: `1px solid ${colors.border}`,
                  color: page >= pages ? colors.textMuted : colors.textSecondary,
                  cursor: page >= pages ? 'not-allowed' : 'pointer', fontSize: 13,
                }}
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
