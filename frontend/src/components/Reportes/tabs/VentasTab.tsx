/**
 * VentasTab.tsx — Reporte de Ventas.
 *
 * Secciones:
 *   1. Filtros de período (fechas) + botón Exportar Excel
 *   2. Tarjetas resumen: total facturas, monto, IVA, retención
 *   3. Tabla detalle de facturas (máx. 500)
 *   4. Top 10 clientes
 *   5. Top 10 productos
 *   6. Distribución por tipo DTE
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, TrendingUp, RefreshCw, Users, Package, PieChart } from 'lucide-react';
import { colors, radius, shadow } from '../../../styles/colors';
import * as svc from '../../../services/reportes.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const hoy    = new Date().toISOString().slice(0, 10);
const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().slice(0, 10);

function fmt(n: number): string {
  return n.toLocaleString('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function badgeEstado(estado: string) {
  const map: Record<string, { bg: string; text: string }> = {
    facturado:  { bg: 'rgba(16,185,129,0.12)',  text: '#059669' },
    borrador:   { bg: 'rgba(245,158,11,0.12)',  text: '#d97706' },
    cancelado:  { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626' },
  };
  const style = map[estado] ?? { bg: colors.inputBg, text: colors.textMuted };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 20, background: style.bg, color: style.text,
      textTransform: 'capitalize',
    }}>
      {estado}
    </span>
  );
}

function badgeTipo(tipo: string) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 7px',
      borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#4f46e5',
    }}>
      {tipo.replace('_', '-')}
    </span>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
}
function KpiCard({ label, value, sub, color }: KpiCardProps) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, padding: '18px 20px',
      boxShadow: shadow.card, borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function VentasTab() {
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin,    setFechaFin]    = useState(hoy);

  const [ventas,       setVentas]       = useState<svc.VentasResponse | null>(null);
  const [topClientes,  setTopClientes]  = useState<svc.TopCliente[]>([]);
  const [topProductos, setTopProductos] = useState<svc.TopProducto[]>([]);
  const [porTipo,      setPorTipo]      = useState<svc.VentaPorTipo[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filtros = { fecha_inicio: fechaInicio, fecha_fin: fechaFin };
      const [v, tc, tp, pt] = await Promise.all([
        svc.getVentas(filtros),
        svc.getTopClientes(filtros),
        svc.getTopProductos(filtros),
        svc.getVentasPorTipo(filtros),
      ]);
      setVentas(v);
      setTopClientes(tc);
      setTopProductos(tp);
      setPorTipo(pt);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleExcel = async () => {
    setExporting(true);
    try {
      await svc.descargarVentasExcel({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
    } catch (e: any) {
      setError(e.message ?? 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Filtros + acciones */}
      <div style={{
        background: colors.cardBg, border: `1px solid ${colors.border}`,
        borderRadius: radius.lg, padding: '16px 20px', boxShadow: shadow.card,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fecha inicio
          </label>
          <input
            type="date" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            style={{ padding: '7px 10px', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 13, color: colors.textPrimary, background: colors.inputBg, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fecha fin
          </label>
          <input
            type="date" value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            style={{ padding: '7px 10px', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 13, color: colors.textPrimary, background: colors.inputBg, outline: 'none' }}
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
      {ventas && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <KpiCard label="Facturas emitidas" value={ventas.resumen.total_facturas.toLocaleString()} color="#6366f1" />
          <KpiCard label="Total ventas"       value={fmt(ventas.resumen.total_ventas)}               color="#10b981" />
          <KpiCard label="IVA generado"       value={fmt(ventas.resumen.total_iva)}                  color="#f59e0b" />
          <KpiCard label="Retención ISR"      value={fmt(ventas.resumen.total_retencion)}            color="#ec4899" />
        </div>
      )}

      {/* Tabla de facturas */}
      {ventas && (
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color={colors.textMuted} />
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
              Detalle de facturas — {ventas.periodo.inicio} al {ventas.periodo.fin}
            </span>
            <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 4 }}>
              ({ventas.facturas.length} registros)
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))' }}>
                  {['N° DTE', 'Tipo', 'Fecha', 'Cliente', 'Estado', 'Subtotal', 'IVA', 'Total'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.facturas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
                      No hay facturas en el período seleccionado.
                    </td>
                  </tr>
                ) : ventas.facturas.map((f, i) => (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? 'var(--row-bg, #fff)' : 'var(--row-bg-alt, #fafafc)', borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, color: colors.textSecondary }}>{f.numero_dte}</td>
                    <td style={{ padding: '9px 14px' }}>{badgeTipo(f.tipo_dte)}</td>
                    <td style={{ padding: '9px 14px', color: colors.textSecondary, whiteSpace: 'nowrap' }}>{f.fecha_emision}</td>
                    <td style={{ padding: '9px 14px', color: colors.textPrimary, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.cliente}</td>
                    <td style={{ padding: '9px 14px' }}>{badgeEstado(f.estado)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: colors.textSecondary }}>{fmt(f.subtotal)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: colors.textSecondary }}>{fmt(f.iva)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: colors.textPrimary }}>{fmt(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top clientes + Top productos en grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Top 10 clientes */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} color={colors.textMuted} />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>Top 10 clientes</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--th-bg, #f4f5f8)' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Cliente</th>
                <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {topClientes.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: colors.textMuted }}>Sin datos</td></tr>
              ) : topClientes.map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={{ padding: '8px 14px', color: colors.textMuted, fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '8px 14px', color: colors.textPrimary, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cliente}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: colors.textPrimary }}>{fmt(c.total_monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top 10 productos */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={15} color={colors.textMuted} />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>Top 10 productos</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--th-bg, #f4f5f8)' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Producto</th>
                <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {topProductos.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: colors.textMuted }}>Sin datos</td></tr>
              ) : topProductos.map((p, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={{ padding: '8px 14px', color: colors.textMuted, fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '8px 14px', color: colors.textPrimary, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.producto}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: colors.textPrimary }}>{fmt(p.total_monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Por tipo DTE */}
      {porTipo.length > 0 && (
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChart size={15} color={colors.textMuted} />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>Distribución por tipo de documento</span>
          </div>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {porTipo.map((t, i) => {
              const totalGeneral = porTipo.reduce((acc, x) => acc + x.total_monto, 0);
              const pct = totalGeneral > 0 ? ((t.total_monto / totalGeneral) * 100).toFixed(1) : '0.0';
              const colores = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
              const color   = colores[i % colores.length];
              return (
                <div key={t.tipo_dte} style={{
                  flex: '1 1 160px', padding: '16px 20px',
                  borderRight: i < porTipo.length - 1 ? `1px solid ${colors.border}` : 'none',
                  borderBottom: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>{t.tipo_dte.replace('_', '-')}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: colors.textPrimary }}>{fmt(t.total_monto)}</div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>{t.total_facturas} facturas · {pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CSS para la animación de carga */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
