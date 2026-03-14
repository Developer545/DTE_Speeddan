/**
 * ComprasTab.tsx — Reporte de Compras.
 *
 * Secciones:
 *   1. Filtros de período + botones Exportar Excel y PDF
 *   2. Tarjetas resumen: órdenes, monto, proveedores únicos, líneas
 *   3. Tabla de órdenes de compra (máx. 500)
 *   4. Top 10 proveedores por monto
 *   5. Distribución por estado
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, FileText, RefreshCw, ShoppingCart, TrendingUp, Users, Package } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { colors, radius, shadow } from '../../../styles/colors';
import * as svc from '../../../services/reportes.service';
import { ComprasPDF } from '../pdf/ComprasPDF';

// ── Helpers ────────────────────────────────────────────────────────────────────

const hoy          = new Date().toISOString().slice(0, 10);
const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().slice(0, 10);

function fmt(n: number): string {
  return n.toLocaleString('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function badgeEstado(estado: string) {
  const map: Record<string, { bg: string; text: string }> = {
    recibida:  { bg: 'rgba(16,185,129,0.12)', text: '#059669' },
    pendiente: { bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
    cancelada: { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626' },
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

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?:  string;
  color: string;
  icon:  React.ReactNode;
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
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: colors.textMuted }}>{sub}</div>}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: colors.cardBg, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, boxShadow: shadow.card, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{title}</span>
      </div>
      <div style={{ padding: '0 0 4px' }}>{children}</div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ComprasTab() {
  const [comprasData,  setComprasData]  = useState<svc.ComprasResponse | null>(null);
  const [proveedores,  setProveedores]  = useState<svc.TopProveedor[]>([]);
  const [porEstado,    setPorEstado]    = useState<svc.CompraPorEstado[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [fechaInicio,  setFechaInicio]  = useState(primerDiaMes);
  const [fechaFin,     setFechaFin]     = useState(hoy);

  const filtros = { fecha_inicio: fechaInicio, fecha_fin: fechaFin };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p, e] = await Promise.all([
        svc.getComprasReporte(filtros),
        svc.getTopProveedores(filtros),
        svc.getComprasPorEstado(filtros),
      ]);
      setComprasData(c);
      setProveedores(p);
      setPorEstado(e);
    } catch {
      setError('No se pudo cargar el reporte de compras.');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleExcel() {
    setExcelLoading(true);
    try { await svc.descargarComprasExcel(filtros); }
    finally { setExcelLoading(false); }
  }

  async function handlePDF() {
    if (!comprasData) return;
    setPdfLoading(true);
    try {
      const blob = await pdf(
        <ComprasPDF data={comprasData} proveedores={proveedores} porEstado={porEstado} />
      ).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Reporte_Compras_${fechaInicio}_${fechaFin}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Estilos de botón ──────────────────────────────────────────────────────

  function btnStyle(variant: 'primary' | 'success' | 'danger', disabled?: boolean) {
    const base: React.CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', borderRadius: radius.md, border: 'none',
      fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'opacity 0.15s',
    };
    if (variant === 'primary')  return { ...base, background: colors.accent, color: colors.accentText };
    if (variant === 'success')  return { ...base, background: '#059669', color: '#fff' };
    return { ...base, background: '#dc2626', color: '#fff' };
  }

  const resumen = comprasData?.resumen;
  const compras = comprasData?.compras ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Filtros ── */}
      <div style={{
        background: colors.cardBg, border: `1px solid ${colors.border}`,
        borderRadius: radius.lg, padding: '16px 20px', boxShadow: shadow.card,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>Desde</label>
          <input
            type="date" value={fechaInicio} max={fechaFin}
            onChange={e => setFechaInicio(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: radius.sm,
              border: `1px solid ${colors.border}`, background: colors.inputBg,
              color: colors.textPrimary, fontSize: 13, cursor: 'pointer',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>Hasta</label>
          <input
            type="date" value={fechaFin} min={fechaInicio} max={hoy}
            onChange={e => setFechaFin(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: radius.sm,
              border: `1px solid ${colors.border}`, background: colors.inputBg,
              color: colors.textPrimary, fontSize: 13, cursor: 'pointer',
            }}
          />
        </div>
        <button onClick={cargar} disabled={loading} style={btnStyle('primary', loading)}>
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handleExcel} disabled={excelLoading || loading} style={btnStyle('success', excelLoading || loading)}>
            <FileSpreadsheet size={15} />
            {excelLoading ? 'Generando…' : 'Excel'}
          </button>
          <button onClick={handlePDF} disabled={pdfLoading || loading || !comprasData} style={btnStyle('danger', pdfLoading || loading || !comprasData)}>
            <FileText size={15} />
            {pdfLoading ? 'Generando…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: radius.md, padding: '12px 16px',
          fontSize: 13, color: '#dc2626', fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <KpiCard
            label="Total Órdenes"
            value={resumen.total_ordenes.toLocaleString('es-SV')}
            color="#6366f1"
            icon={<ShoppingCart size={16} color="#6366f1" />}
          />
          <KpiCard
            label="Monto Total"
            value={fmt(resumen.monto_total)}
            color="#10b981"
            icon={<TrendingUp size={16} color="#10b981" />}
          />
          <KpiCard
            label="Proveedores Únicos"
            value={resumen.proveedores_unicos.toLocaleString('es-SV')}
            color="#f59e0b"
            icon={<Users size={16} color="#f59e0b" />}
          />
          <KpiCard
            label="Líneas de Producto"
            value={resumen.productos_lineas.toLocaleString('es-SV')}
            sub="ítems registrados"
            color="#3b82f6"
            icon={<Package size={16} color="#3b82f6" />}
          />
        </div>
      )}

      {/* ── Tabla de órdenes ── */}
      <Section title={`Órdenes de Compra (${compras.length})`} icon={<ShoppingCart size={15} color={colors.accent} />}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.inputBg }}>
                {['N° Orden', 'Proveedor', 'Fecha', 'Estado', 'Líneas', 'Total'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: h === 'Total' || h === 'Líneas' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, color: colors.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    borderBottom: `1px solid ${colors.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
                    No hay órdenes de compra en el período seleccionado.
                  </td>
                </tr>
              )}
              {compras.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? 'transparent' : colors.inputBg }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>
                    {c.orden_compra}
                  </td>
                  <td style={{ padding: '10px 16px', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>
                    {c.proveedor}
                  </td>
                  <td style={{ padding: '10px 16px', color: colors.textSecondary, fontSize: 12, borderBottom: `1px solid ${colors.border}` }}>
                    {c.fecha_compra}
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}` }}>
                    {badgeEstado(c.estado)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: colors.textSecondary, fontSize: 12, borderBottom: `1px solid ${colors.border}` }}>
                    {c.num_lineas}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>
                    {fmt(c.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Top Proveedores + Por Estado ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Top proveedores */}
        <Section title="Top 10 Proveedores" icon={<Users size={15} color="#f59e0b" />}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.inputBg }}>
                {['#', 'Proveedor', 'Órdenes', 'Monto Total'].map(h => (
                  <th key={h} style={{
                    padding: '8px 14px', textAlign: h === 'Monto Total' || h === 'Órdenes' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, color: colors.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    borderBottom: `1px solid ${colors.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
                    Sin datos en el período.
                  </td>
                </tr>
              )}
              {proveedores.map((p, i) => (
                <tr key={p.proveedor} style={{ background: i % 2 === 0 ? 'transparent' : colors.inputBg }}>
                  <td style={{ padding: '8px 14px', color: colors.textMuted, fontSize: 12, width: 36, borderBottom: `1px solid ${colors.border}` }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '8px 14px', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>
                    {p.proveedor}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>
                    {p.total_ordenes}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#059669', borderBottom: `1px solid ${colors.border}` }}>
                    {fmt(p.total_monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Por estado */}
        <Section title="Por Estado" icon={<TrendingUp size={15} color="#6366f1" />}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.inputBg }}>
                {['Estado', 'Órdenes', 'Monto Total'].map(h => (
                  <th key={h} style={{
                    padding: '8px 14px', textAlign: h !== 'Estado' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, color: colors.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    borderBottom: `1px solid ${colors.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porEstado.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
                    Sin datos en el período.
                  </td>
                </tr>
              )}
              {porEstado.map((e, i) => (
                <tr key={e.estado} style={{ background: i % 2 === 0 ? 'transparent' : colors.inputBg }}>
                  <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.border}` }}>
                    {badgeEstado(e.estado)}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>
                    {e.total_ordenes}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#059669', borderBottom: `1px solid ${colors.border}` }}>
                    {fmt(e.total_monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Barra visual de proporción */}
          {porEstado.length > 0 && (() => {
            const total = porEstado.reduce((s, e) => s + e.total_monto, 0);
            const paleta: Record<string, string> = {
              recibida: '#10b981', pendiente: '#f59e0b', cancelada: '#ef4444',
            };
            return (
              <div style={{ padding: '12px 14px 8px' }}>
                <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 1 }}>
                  {porEstado.map(e => (
                    <div
                      key={e.estado}
                      style={{
                        flex: e.total_monto / total,
                        background: paleta[e.estado] ?? colors.accent,
                        transition: 'flex 0.4s ease',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  {porEstado.map(e => (
                    <div key={e.estado} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: paleta[e.estado] ?? colors.accent }} />
                      <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' }}>
                        {e.estado} ({((e.total_monto / total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </Section>

      </div>
    </div>
  );
}
