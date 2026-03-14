/**
 * StockTab.tsx — Lista de stock con alertas de stock mínimo (FASE 7A).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, AlertTriangle, RefreshCw } from 'lucide-react';
import { inventarioService } from '../../../services/inventario.service';
import { Inventario, AlertaStock } from '../../../types/inventario.types';
import { colors, radius, shadow } from '../../../styles/colors';
import SearchBar  from '../../Common/SearchBar';
import Pagination from '../../Common/Pagination';
import { notify } from '../../../utils/notify';

const PAGE_LIMIT = 10;

const fmtDate = new Intl.DateTimeFormat('es-SV', { year: 'numeric', month: 'short', day: 'numeric' });

function formatDate(val: string | null): string {
  if (!val) return '—';
  return fmtDate.format(new Date(val));
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function stockStatus(cantidad: number, stockMinimo: number): { color: string; bg: string; label: string } | null {
  if (cantidad === 0)                            return { color: '#ef4444', bg: '#fef2f2',         label: 'Sin stock' };
  if (stockMinimo > 0 && cantidad < stockMinimo) return { color: '#d97706', bg: '#fffbeb',         label: 'Bajo mínimo' };
  return null;
}

export function StockTab() {
  const [items,       setItems]       = useState<Inventario[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [page,        setPage]        = useState(1);
  const [limit,       setLimit]       = useState(PAGE_LIMIT);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [alertas,     setAlertas]     = useState<AlertaStock[]>([]);
  const [alertasOpen, setAlertasOpen] = useState(false);

  const fetchData = useCallback(async (p: number, lim: number, q: string) => {
    setLoading(true);
    try {
      const [res, als] = await Promise.all([
        inventarioService.getAll({ search: q, page: p, limit: lim }),
        inventarioService.getAlertas(),
      ]);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setAlertas(als);
    } catch (err: any) {
      notify.error('Error al cargar inventario', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(page, limit, search); }, [page, limit, search, fetchData]);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left',
    background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
    borderBottom: `2px solid ${colors.border}`, whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13, color: colors.textPrimary,
    borderBottom: `1px solid ${colors.borderLight}`, verticalAlign: 'middle',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Panel alertas */}
      {alertas.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: radius.md, overflow: 'hidden' }}>
          <button
            onClick={() => setAlertasOpen(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
              {alertas.length} producto{alertas.length !== 1 ? 's' : ''} bajo stock mínimo
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#b45309' }}>
              {alertasOpen ? 'Ocultar ▲' : 'Ver detalle ▼'}
            </span>
          </button>
          {alertasOpen && (
            <div style={{ borderTop: '1px solid #fcd34d', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#fef3c7' }}>
                    {['Producto', 'Categoría', 'Stock actual', 'Stock mínimo', 'Faltante'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#92400e', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alertas.map(a => (
                    <tr key={a.producto_id} style={{ borderBottom: '1px solid #fde68a' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#78350f' }}>{a.producto_nombre}</td>
                      <td style={{ padding: '8px 14px', color: '#92400e' }}>{a.categoria_nombre ?? '—'}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#ef4444' }}>{Number(a.stock_actual)}</td>
                      <td style={{ padding: '8px 14px', color: '#92400e' }}>{Number(a.stock_minimo)}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#dc2626' }}>+{Number(a.diferencia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabla de stock */}
      <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.border}`, boxShadow: shadow.card, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${colors.border}`,
          background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <SearchBar value={search} onChange={handleSearch} placeholder="Buscar por nombre de producto..." />
          <button
            onClick={() => fetchData(page, limit, search)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', background: colors.accent, color: colors.accentText,
              border: 'none', borderRadius: radius.sm, fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>#</th>
                <th style={thStyle}>Producto</th>
                <th style={thStyle}>Categoría</th>
                <th style={thStyle}>Lote</th>
                <th style={thStyle}>Vencimiento</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Stock</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Mínimo</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '48px', color: colors.textMuted }}>Cargando...</td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '64px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: colors.textMuted }}>
                      <Box size={48} />
                      <span style={{ fontSize: 14 }}>{search ? 'No se encontraron productos' : 'No hay registros en inventario'}</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && items.map((item, idx) => {
                const badge = stockStatus(Number(item.cantidad), Number(item.stock_minimo));
                const days  = daysUntil(item.fecha_vencimiento);
                return (
                  <tr
                    key={item.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{item.producto_nombre}</td>
                    <td style={{ ...tdStyle, color: colors.textMuted }}>{item.categoria_nombre ?? '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{item.lote ?? '—'}</td>
                    <td style={tdStyle}>
                      {item.fecha_vencimiento ? (
                        <span style={{ color: days !== null && days < 30 ? '#d97706' : colors.textPrimary, fontWeight: days !== null && days < 30 ? 600 : 400 }}>
                          {formatDate(item.fecha_vencimiento)}
                          {days !== null && days < 30 && ` (${days}d)`}
                        </span>
                      ) : <span style={{ color: colors.textMuted }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: badge ? badge.color : '#10b981' }}>
                      {Number(item.cantidad)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: colors.textMuted }}>
                      {Number(item.stock_minimo) > 0 ? Number(item.stock_minimo) : '—'}
                    </td>
                    <td style={tdStyle}>
                      {badge ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
