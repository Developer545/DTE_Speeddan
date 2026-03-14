/**
 * InventarioTab.tsx — Reporte de Inventario.
 *
 * Secciones:
 *   1. Tarjetas resumen: total productos, unidades, valor total, sin stock
 *   2. Tabla de stock actual con valorización
 *   3. Productos sin existencias
 *   4. Lotes próximos a vencer (filtro de días configurable)
 *   5. Botón exportar Excel
 */

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Package, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { colors, radius, shadow } from '../../../styles/colors';
import * as svc from '../../../services/reportes.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-SV', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}
function KpiCard({ label, value, sub, color, icon }: KpiCardProps) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, padding: '18px 20px', boxShadow: shadow.card,
      borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: colors.textMuted }}>{sub}</div>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function InventarioTab() {
  const [stock,       setStock]       = useState<svc.StockResponse | null>(null);
  const [sinStock,    setSinStock]    = useState<svc.FilaSinStock[]>([]);
  const [lotes,       setLotes]       = useState<svc.FilaLoteVencimiento[]>([]);
  const [diasVencer,  setDiasVencer]  = useState(30);
  const [loading,     setLoading]     = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, ss, l] = await Promise.all([
        svc.getInventarioStock(),
        svc.getProductosSinStock(),
        svc.getLotesPorVencer(diasVencer),
      ]);
      setStock(s);
      setSinStock(ss);
      setLotes(l);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [diasVencer]);

  const handleExcel = async () => {
    setExporting(true);
    try {
      await svc.descargarInventarioExcel(diasVencer);
    } catch (e: any) {
      setError(e.message ?? 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Barra de acciones */}
      <div style={{
        background: colors.cardBg, border: `1px solid ${colors.border}`,
        borderRadius: radius.lg, padding: '16px 20px', boxShadow: shadow.card,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Lotes por vencer en (días)
          </label>
          <input
            type="number" min={1} max={365} value={diasVencer}
            onChange={e => setDiasVencer(Math.max(1, parseInt(e.target.value) || 30))}
            style={{ width: 90, padding: '7px 10px', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 13, color: colors.textPrimary, background: colors.inputBg, outline: 'none' }}
          />
        </div>
        <button
          onClick={cargar} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: colors.accent, color: colors.accentText, border: 'none', borderRadius: radius.sm, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
        <button
          onClick={handleExcel} disabled={exporting || loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: 13, fontWeight: 600, cursor: (exporting || loading) ? 'not-allowed' : 'pointer', opacity: (exporting || loading) ? 0.7 : 1, marginLeft: 'auto' }}
        >
          <FileSpreadsheet size={14} />
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: radius.md, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* KPI cards */}
      {stock && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
          <KpiCard label="Total productos"   value={stock.resumen.total_productos.toLocaleString()}     color="#6366f1" icon={<Package size={16} color="#6366f1" />} />
          <KpiCard label="Unidades en stock" value={fmtNum(stock.resumen.total_unidades)}               color="#10b981" icon={<Package size={16} color="#10b981" />} />
          <KpiCard label="Valor inventario"  value={fmt(stock.resumen.valor_total)}                     color="#f59e0b" icon={<Package size={16} color="#f59e0b" />} />
          <KpiCard label="Sin stock"         value={stock.resumen.productos_sin_stock.toLocaleString()} color="#ef4444" icon={<AlertTriangle size={16} color="#ef4444" />} sub={stock.resumen.productos_sin_stock > 0 ? 'Requieren reabastecimiento' : 'Todos con existencias'} />
        </div>
      )}

      {/* Tabla stock actual */}
      {stock && (
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={16} color={colors.textMuted} />
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
              Stock actual por producto
            </span>
            <span style={{ fontSize: 12, color: colors.textMuted }}>({stock.productos.length} productos)</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))' }}>
                  {['Producto', 'Stock Actual', 'Precio Unitario', 'Valor en Inventario'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Producto' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stock.productos.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
                      No hay productos registrados.
                    </td>
                  </tr>
                ) : stock.productos.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'var(--row-bg, #fff)' : 'var(--row-bg-alt, #fafafc)', borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: '9px 16px', color: colors.textPrimary, fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, color: p.stock_actual === 0 ? '#dc2626' : colors.textPrimary }}>
                      {fmtNum(p.stock_actual)}
                      {p.stock_actual === 0 && <span style={{ fontSize: 10, marginLeft: 6, color: '#dc2626' }}>SIN STOCK</span>}
                    </td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', color: colors.textSecondary }}>{fmt(p.precio_unitario)}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, color: colors.textPrimary }}>{fmt(p.valor_inventario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Sin stock + Lotes por vencer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>

        {/* Productos sin stock */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="#ef4444" />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
              Sin stock
              {sinStock.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
                  {sinStock.length}
                </span>
              )}
            </span>
          </div>
          {sinStock.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
              Todos los productos tienen stock.
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {sinStock.map((p, i) => (
                <div key={p.id} style={{ padding: '9px 16px', borderBottom: `1px solid ${colors.borderLight}`, fontSize: 13, color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: colors.textMuted, width: 20, textAlign: 'right' }}>{i + 1}.</span>
                  {p.nombre}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lotes próximos a vencer */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={15} color="#f59e0b" />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
              Lotes venciendo en {diasVencer} días
              {lotes.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
                  {lotes.length}
                </span>
              )}
            </span>
          </div>
          {lotes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
              No hay lotes próximos a vencer en {diasVencer} días.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ background: 'var(--th-bg, #f4f5f8)' }}>
                    {['Producto', 'Lote', 'Vencimiento', 'Días', 'Cantidad'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Días' || h === 'Cantidad' ? 'right' : 'left', fontWeight: 700, color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((l, i) => {
                    const critico = l.dias_restantes <= 7;
                    const alerta  = l.dias_restantes <= 15 && !critico;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}`, background: critico ? '#fef2f2' : alerta ? 'rgba(245,158,11,0.05)' : undefined }}>
                        <td style={{ padding: '8px 14px', color: colors.textPrimary, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.producto}</td>
                        <td style={{ padding: '8px 14px', color: colors.textSecondary, fontFamily: 'monospace' }}>{l.lote ?? '—'}</td>
                        <td style={{ padding: '8px 14px', color: colors.textSecondary, whiteSpace: 'nowrap' }}>{l.fecha_vencimiento}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: critico ? '#dc2626' : alerta ? '#d97706' : '#059669' }}>
                          {l.dias_restantes}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: colors.textSecondary }}>{fmtNum(l.cantidad)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
