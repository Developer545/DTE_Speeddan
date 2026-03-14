/**
 * KardexTab.tsx — Historial de movimientos (Kardex) por producto (FASE 7A).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { inventarioService } from '../../../services/inventario.service';
import { MovimientoKardex, Inventario } from '../../../types/inventario.types';
import { colors, radius, shadow } from '../../../styles/colors';

const fmtDt = new Intl.DateTimeFormat('es-SV', {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

function formatDt(val: string): string {
  return fmtDt.format(new Date(val));
}

function fmtMoney(val: number | null): string {
  if (val === null) return '—';
  return `$${Number(val).toFixed(2)}`;
}

const TIPO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  entrada:             { bg: 'rgba(16,185,129,0.1)',  text: '#059669', label: 'Compra'       },
  salida:              { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', label: 'Venta'        },
  devolucion:          { bg: 'rgba(99,102,241,0.1)',  text: '#4f46e5', label: 'Devolución'   },
  merma:               { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', label: 'Merma'        },
  dano:                { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', label: 'Daño'         },
  robo:                { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', label: 'Robo'         },
  correccion_positiva: { bg: 'rgba(16,185,129,0.1)',  text: '#059669', label: 'Corrección +' },
  correccion_negativa: { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', label: 'Corrección –' },
};

export function KardexTab() {
  const [query,          setQuery]          = useState('');
  const [suggestions,    setSuggestions]    = useState<Inventario[]>([]);
  const [showSug,        setShowSug]        = useState(false);
  const [loadingSug,     setLoadingSug]     = useState(false);
  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [selectedNombre, setSelectedNombre] = useState('');
  const [kardex,         setKardex]         = useState<MovimientoKardex[]>([]);
  const [loading,        setLoading]        = useState(false);

  // Búsqueda de sugerencias con debounce
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setShowSug(false); return; }
    setLoadingSug(true);
    const t = setTimeout(async () => {
      try {
        const res = await inventarioService.getAll({ search: query, limit: 10 });
        const seen  = new Set<number>();
        const unique = res.data.filter(i => {
          if (seen.has(i.producto_id)) return false;
          seen.add(i.producto_id);
          return true;
        });
        setSuggestions(unique);
        setShowSug(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadKardex = useCallback(async (productoId: number) => {
    setLoading(true);
    try {
      const data = await inventarioService.getKardex(productoId);
      setKardex(data);
    } catch {
      setKardex([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectProduct = (item: Inventario) => {
    setSelectedId(item.producto_id);
    setSelectedNombre(item.producto_nombre);
    setQuery(item.producto_nombre);
    setSuggestions([]);
    setShowSug(false);
    loadKardex(item.producto_id);
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left',
    background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
    borderBottom: `2px solid ${colors.border}`, whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13, color: colors.textPrimary,
    borderBottom: `1px solid ${colors.borderLight}`, verticalAlign: 'middle',
  };

  const NUM_COLS = ['Entrada', 'Salida', 'Saldo', 'P. Unit.'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Selector de producto */}
      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20, boxShadow: shadow.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, marginBottom: 12 }}>
          Seleccionar producto
        </div>

        <div style={{ position: 'relative', maxWidth: 440 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedId(null); }}
              onFocus={() => suggestions.length > 0 && setShowSug(true)}
              placeholder="Escriba el nombre del producto..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 34px',
                border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                fontSize: 13, color: colors.textPrimary, background: colors.inputBg, outline: 'none',
              }}
            />
            {loadingSug && (
              <RefreshCw size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite', color: colors.textMuted }} />
            )}
          </div>

          {showSug && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              background: colors.cardBg, border: `1px solid ${colors.border}`,
              borderRadius: radius.md, boxShadow: shadow.modal, marginTop: 4,
              maxHeight: 220, overflowY: 'auto',
            }}>
              {suggestions.map(s => (
                <button
                  key={s.producto_id}
                  onClick={() => selectProduct(s)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    fontSize: 13, color: colors.textPrimary,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 600 }}>{s.producto_nombre}</span>
                  {s.categoria_nombre && (
                    <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 8 }}>{s.categoria_nombre}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedId && !loading && (
          <div style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
            Kardex de: <strong style={{ color: colors.textPrimary }}>{selectedNombre}</strong>
            {' · '}{kardex.length} movimientos
            {' '}
            <button
              onClick={() => loadKardex(selectedId)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.accent, fontSize: 12, fontWeight: 600, padding: 0 }}
            >
              ↺ Actualizar
            </button>
          </div>
        )}
      </div>

      {/* Tabla de movimientos */}
      {selectedId ? (
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
              Movimientos — {selectedNombre}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha', 'Tipo', 'Descripción', 'Referencia', 'Entrada', 'Salida', 'Saldo', 'P. Unit.', 'Motivo'].map(h => (
                    <th key={h} style={{ ...thStyle, textAlign: NUM_COLS.includes(h) ? 'right' : 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '48px', color: colors.textMuted }}>
                      Cargando...
                    </td>
                  </tr>
                ) : kardex.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '48px', color: colors.textMuted }}>
                      Sin movimientos registrados para este producto.
                    </td>
                  </tr>
                ) : kardex.map((m, i) => {
                  const style = TIPO_STYLES[m.tipo] ?? { bg: colors.inputBg, text: colors.textMuted, label: m.tipo };
                  return (
                    <tr
                      key={`${m.tipo}-${m.id}-${i}`}
                      style={{ background: i % 2 === 0 ? 'var(--row-bg, #fff)' : 'var(--row-bg-alt, #fafafc)' }}
                    >
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: colors.textMuted, fontSize: 12 }}>
                        {formatDt(m.fecha)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: style.bg, color: style.text }}>
                          {style.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: colors.textSecondary }}>{m.descripcion}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: colors.textMuted }}>
                        {m.referencia ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {m.entrada !== null ? `+${Number(m.entrada)}` : ''}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        {m.salida !== null ? `-${Number(m.salida)}` : ''}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: colors.textPrimary }}>
                        {Number(m.saldo).toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: colors.textMuted, fontSize: 12 }}>
                        {fmtMoney(m.precio_unitario)}
                      </td>
                      <td style={{ ...tdStyle, color: colors.textMuted, fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.motivo ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          borderRadius: radius.lg, padding: '64px 24px', textAlign: 'center',
          boxShadow: shadow.card, color: colors.textMuted,
        }}>
          <div style={{ fontSize: 14 }}>Busque y seleccione un producto para ver su historial de movimientos.</div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
