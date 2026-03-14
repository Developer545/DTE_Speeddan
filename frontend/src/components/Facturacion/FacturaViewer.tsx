/**
 * FacturaViewer.tsx — Visualizador HTML moderno de facturas electrónicas.
 *
 * Acepta el objeto json_pdf (PDFVisualizacionJSON) y lo renderiza
 * como una factura electrónica estilizada lista para imprimir.
 *
 * Usado por:
 *   - POS/index.tsx  → tras crear la factura (json_pdf viene en la respuesta)
 *   - Facturacion/index.tsx → al abrir una factura del listado (fetch por id)
 */

import React, { useRef } from 'react';
import { X, Printer, Building2, User } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';

// ── Tipos (espejo de PDFVisualizacionJSON del backend) ──────────────────────

interface LineaFactura {
  numero_linea:    number;
  codigo_producto: string;
  descripcion:     string;
  cantidad:        number;
  precio_unitario: number;
  descuento?:      number;   // Descuento monetario por línea (Art. 62 LIVA / DTE montoDescu)
  subtotal:        number;
  iva_linea?:      number;
  total:           number;
}

interface JsonPdf {
  numero_dte:      string;
  tipo_dte_nombre: string;
  fecha_emision:   string;
  fecha_vencimiento?: string;
  numero_interno?: string;
  emisor: {
    nombre_negocio: string;
    nit:            string;
    direccion:      string;
    telefono:       string;
    correo:         string;
  };
  cliente: {
    nombre:       string;
    tipo_cliente: string;
    documento:    string;
    direccion:    string;
    telefono:     string;
    correo:       string;
  };
  lineas: LineaFactura[];
  resumen: {
    subtotal:        number;
    descuento?:      number;   // Suma total de descuentos por línea
    iva?:            number;
    iva_porcentaje?: number;
    retencion_renta?: number; // Retención ISR 1% Art. 156-A CT (solo DTE_03 gran contribuyente)
    total:           number;
    moneda:          string;
  };
  notas?:          string;
  pie_de_pagina:   string;
}

interface FacturaViewerProps {
  jsonPdf: JsonPdf;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtCur = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });

function fmtFecha(s: string): string {
  return new Date(s.split('T')[0] + 'T12:00:00').toLocaleDateString('es-SV', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Componente ───────────────────────────────────────────────────────────────

export function FacturaViewer({ jsonPdf: f, onClose }: FacturaViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${f.numero_dte}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
            .print-area { max-width: 760px; margin: 24px auto; padding: 32px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
            td { border-bottom: 1px solid #eee; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="print-area">${content}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const overlayRef = useRef<HTMLDivElement>(null);

  const esCredito    = f.resumen.iva !== undefined && (f.resumen.iva ?? 0) > 0;
  const hasDescuento = f.lineas.some(l => (l.descuento ?? 0) > 0);

  const tdStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: '13px',
    borderBottom: `1px solid ${colors.borderLight}`,
    color: colors.textPrimary,
    verticalAlign: 'middle',
  };
  const thStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: colors.textMuted,
    background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
    borderBottom: `1px solid ${colors.border}`,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: colors.cardBg,
        borderRadius: radius.xl,
        boxShadow: shadow.modal,
        width: '100%',
        maxWidth: 820,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Modal header ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.accent,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
              {f.numero_dte}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {f.tipo_dte_nombre} · {fmtFecha(f.fecha_emision)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: radius.sm,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Printer size={14} /> Imprimir
            </button>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', padding: '7px 8px', borderRadius: radius.sm, display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Contenido scrollable ──────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: colors.pageBg }}>
          <div ref={printRef}>

            {/* ── Cabecera: emisor + número ── */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              gap: 24, marginBottom: 24,
              padding: '20px 24px',
              background: colors.cardBg,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
            }}>
              {/* Datos del emisor */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: radius.md,
                  background: colors.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Building2 size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: colors.textPrimary, marginBottom: 2 }}>
                    {f.emisor.nombre_negocio}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.7 }}>
                    NIT: {f.emisor.nit}<br />
                    {f.emisor.direccion}<br />
                    Tel: {f.emisor.telefono} · {f.emisor.correo}
                  </div>
                </div>
              </div>

              {/* Número DTE */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: esCredito ? colors.badgeEmpresaBg : colors.badgeNaturalBg,
                  color: esCredito ? colors.badgeEmpresaText : colors.badgeNaturalText,
                  borderRadius: 9999, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 8,
                }}>
                  {f.tipo_dte_nombre}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>
                  Número DTE
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                  {f.numero_dte}
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                  Emisión: {fmtFecha(f.fecha_emision)}
                </div>
                {f.fecha_vencimiento && (
                  <div style={{ fontSize: 12, color: colors.textMuted }}>
                    Vence: {fmtFecha(f.fecha_vencimiento)}
                  </div>
                )}
              </div>
            </div>

            {/* ── Datos del cliente ── */}
            <div style={{
              padding: '16px 20px',
              background: colors.cardBg,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              marginBottom: 20,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: radius.sm,
                background: colors.mutedBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <User size={18} color={colors.textSecondary} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                  Cliente
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, marginBottom: 2 }}>
                  {f.cliente.nombre}
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.7 }}>
                  {f.cliente.tipo_cliente} · Doc: {f.cliente.documento}
                  {f.cliente.direccion ? <><br />{f.cliente.direccion}</> : null}
                  {f.cliente.telefono || f.cliente.correo
                    ? <><br />{[f.cliente.telefono, f.cliente.correo].filter(Boolean).join(' · ')}</>
                    : null}
                </div>
              </div>
            </div>

            {/* ── Líneas de factura ── */}
            <div style={{
              background: colors.cardBg,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              marginBottom: 20,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 32, textAlign: 'center' }}>#</th>
                    <th style={thStyle}>Descripción</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Cant.</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Precio</th>
                    {hasDescuento && <th style={{ ...thStyle, textAlign: 'right' }}>Dscto.</th>}
                    {esCredito    && <th style={{ ...thStyle, textAlign: 'right' }}>IVA</th>}
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {f.lineas.map(l => (
                    <tr
                      key={l.numero_linea}
                      onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{ transition: 'background 0.15s' }}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 11, color: colors.textMuted }}>{l.numero_linea}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500 }}>{l.descripcion}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>{l.codigo_producto}</div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(l.cantidad)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCur.format(Number(l.precio_unitario))}</td>
                      {hasDescuento && (
                        <td style={{ ...tdStyle, textAlign: 'right', color: (l.descuento ?? 0) > 0 ? '#d97706' : colors.textMuted }}>
                          {(l.descuento ?? 0) > 0 ? `-${fmtCur.format(Number(l.descuento))}` : '—'}
                        </td>
                      )}
                      {esCredito && (
                        <td style={{ ...tdStyle, textAlign: 'right', color: colors.textSecondary }}>
                          {l.iva_linea != null ? fmtCur.format(Number(l.iva_linea)) : '—'}
                        </td>
                      )}
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtCur.format(Number(l.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Resumen de totales ── */}
            <div style={{
              background: colors.cardBg,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              padding: '16px 20px',
              marginBottom: 20,
              maxWidth: 320,
              marginLeft: 'auto',
            }}>
              {/* Subtotal bruto */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}`, fontSize: 13, color: colors.textSecondary }}>
                <span>Subtotal</span>
                <span>{fmtCur.format(Number(f.resumen.subtotal))}</span>
              </div>

              {/* Descuento total (solo si aplica) */}
              {(f.resumen.descuento ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}`, fontSize: 13, color: '#d97706' }}>
                  <span>Descuento</span>
                  <span>-{fmtCur.format(Number(f.resumen.descuento))}</span>
                </div>
              )}

              {/* IVA (solo DTE_03 Crédito Fiscal) */}
              {esCredito && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}`, fontSize: 13, color: colors.textSecondary }}>
                  <span>IVA ({f.resumen.iva_porcentaje ?? 13}%)</span>
                  <span>{fmtCur.format(Number(f.resumen.iva))}</span>
                </div>
              )}

              {/* Retención ISR 1% Art. 156-A CT (solo DTE_03 gran contribuyente) */}
              {(f.resumen.retencion_renta ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}`, fontSize: 13, color: '#7c3aed' }}>
                  <span>Retención ISR (1%)</span>
                  <span>-{fmtCur.format(Number(f.resumen.retencion_renta))}</span>
                </div>
              )}

              {/* Total final */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4, fontSize: 17, fontWeight: 800, color: colors.textPrimary }}>
                <span>TOTAL ({f.resumen.moneda})</span>
                <span>{fmtCur.format(Number(f.resumen.total))}</span>
              </div>
            </div>

            {/* ── Notas ── */}
            {f.notas && (
              <div style={{
                background: colors.cardBg,
                borderRadius: radius.sm,
                border: `1px solid ${colors.border}`,
                padding: '12px 16px',
                marginBottom: 16,
                fontSize: 13,
                color: colors.textSecondary,
              }}>
                <strong style={{ color: colors.textPrimary }}>Notas: </strong>{f.notas}
              </div>
            )}

            {/* ── Pie de página ── */}
            <div style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted, lineHeight: 1.8 }}>
              {f.pie_de_pagina}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default FacturaViewer;
