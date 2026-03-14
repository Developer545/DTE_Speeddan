/**
 * Facturacion/index.tsx — Registro y gestión de facturas electrónicas.
 *
 * Muestra todas las facturas emitidas desde el POS con:
 *   - Búsqueda por número DTE o cliente
 *   - Estado visual (borrador / facturado / cancelado)
 *   - Acción de marcar como facturado o cancelar
 *   - Visualización de la factura como HTML moderno (FacturaViewer)
 *   - Descarga del JSON para Hacienda
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, Check, X, Download, FileText } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import * as facturacionService from '../../services/facturacion.service';
import SearchBar     from '../Common/SearchBar';
import Pagination    from '../Common/Pagination';
import { notify }   from '../../utils/notify';
import ConfirmDialog from '../Common/ConfirmDialog';
import { FacturaViewer } from './FacturaViewer';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface FacturaRow {
  id:               number;
  numero_dte:       string;
  tipo_dte:         string;
  cliente_nombre?:  string;   // COALESCE: nombre registrado | receptor_nombre | 'Clientes Varios'
  cliente_tipo?:    string;   // null para modos A/B (sin cliente registrado)
  fecha_emision:    string;
  estado:           'borrador' | 'facturado' | 'cancelado';
  subtotal:         number;
  iva:              number;
  retencion_renta?: number;   // ISR 1% Art. 156-A CT (solo DTE_03 gran contribuyente)
  total:            number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtCur  = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });
const fmtDate = (s: string) => new Date(s.split('T')[0] + 'T12:00:00').toLocaleDateString('es-SV');

const PAGE_LIMIT = 10;

// ── Badge: estado ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: FacturaRow['estado'] }) {
  const map = {
    borrador:   { label: 'Borrador',   bg: '#fff8e1', color: '#f59e0b' },
    facturado:  { label: 'Facturado',  bg: colors.successBg, color: colors.success },
    cancelado:  { label: 'Cancelado',  bg: colors.dangerBg,  color: colors.dangerText },
  };
  const s = map[estado] ?? map.borrador;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '0.3px' }}>
      {s.label}
    </span>
  );
}

// ── Badge: tipo DTE ───────────────────────────────────────────────────────────

const TIPO_BADGE: Record<string, { bg: string; color: string }> = {
  DTE_01: { bg: colors.badgeNaturalBg,   color: colors.badgeNaturalText },
  DTE_03: { bg: colors.badgeEmpresaBg,   color: colors.badgeEmpresaText },
  DTE_05: { bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
  DTE_06: { bg: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  DTE_11: { bg: 'rgba(99,102,241,0.1)',  color: '#4f46e5' },
};

function TipoBadge({ tipo }: { tipo: string }) {
  const s = TIPO_BADGE[tipo] ?? TIPO_BADGE.DTE_01;
  const label = tipo.replace('DTE_', 'DTE-');
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 9px', borderRadius: 9999, fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function FacturacionList() {
  const [items,      setItems]      = useState<FacturaRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(PAGE_LIMIT);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(false);

  // ── Viewer ──
  const [viewerData,  setViewerData]  = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  // ── Confirmaciones de estado ──
  const [confirmFacturado, setConfirmFacturado] = useState<number | null>(null);
  const [confirmCancelar,  setConfirmCancelar]  = useState<number | null>(null);
  const [actionLoading,    setActionLoading]    = useState(false);

  // ── Fetch ──
  const fetchData = useCallback(async (p: number, lim: number, q: string) => {
    setLoading(true);
    try {
      const res = await facturacionService.listarFacturas(q, p, lim);
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch (err: any) {
      notify.error('Error al cargar facturas', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(page, limit, search); }, [page, limit, search, fetchData]);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  // ── Ver factura (FacturaViewer) ──
  const handleVerFactura = async (id: number) => {
    setViewerLoading(true);
    try {
      const jsonPdf = await facturacionService.obtenerJsonPDF(id);
      setViewerData(jsonPdf);
    } catch (err: any) {
      notify.error('No se pudo cargar la vista de la factura', err.message);
    } finally {
      setViewerLoading(false);
    }
  };

  // ── Descargar JSON DTE ──
  const handleDescargar = async (item: FacturaRow) => {
    try {
      const jsonDte = await facturacionService.obtenerJsonDTE(item.id);
      const blob = new Blob([JSON.stringify(jsonDte, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.numero_dte}_dte.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      notify.error('Error al descargar JSON DTE', err.message);
    }
  };

  // ── Marcar facturado ──
  const handleMarcarFacturado = async () => {
    if (confirmFacturado === null) return;
    setActionLoading(true);
    try {
      await facturacionService.marcarFacturado(confirmFacturado);
      setConfirmFacturado(null);
      fetchData(page, limit, search);
    } catch (err: any) {
      notify.error('Error al actualizar estado', err.message);
      setConfirmFacturado(null);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Cancelar factura ──
  const handleCancelar = async () => {
    if (confirmCancelar === null) return;
    setActionLoading(true);
    try {
      await facturacionService.cancelarFactura(confirmCancelar);
      setConfirmCancelar(null);
      fetchData(page, limit, search);
      notify.success('Factura cancelada');
    } catch (err: any) {
      notify.error('Error al cancelar factura', err.message);
      setConfirmCancelar(null);
    } finally {
      setActionLoading(false);
    }
  };

  const subtitle = search
    ? `${total} resultado${total !== 1 ? 's' : ''} para "${search}"`
    : `${total} factura${total !== 1 ? 's' : ''} registrada${total !== 1 ? 's' : ''}`;

  // ── Estilos ──
  const tdStyle: React.CSSProperties = {
    padding: '11px 14px',
    fontSize: '13px',
    color: colors.textPrimary,
    borderBottom: `1px solid ${colors.borderLight}`,
    verticalAlign: 'middle',
  };
  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    textAlign: 'left',
    background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
    borderBottom: `2px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };
  const actionBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '5px', borderRadius: radius.sm,
    display: 'flex', alignItems: 'center',
  };

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
          <h1 style={{ fontSize: 21, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px', margin: 0 }}>
            Facturación Electrónica
          </h1>
          <span style={{
            background: '#111', color: '#fff',
            padding: '2px 8px', borderRadius: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
          }}>
            MH
          </span>
        </div>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 0 14px' }}>{subtitle}</p>
      </div>

      {/* ── Tarjeta principal ── */}
      <div style={{
        background: colors.cardBg,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${colors.border}`,
          background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
        }}>
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Buscar por número DTE o cliente..."
          />
          <div style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', marginLeft: 16 }}>
            Las facturas se crean desde el <strong>Punto de Venta</strong>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 44, textAlign: 'center' }}>N°</th>
                <th style={thStyle}>Número DTE</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>IVA</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted, padding: 48 }}>
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '64px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: colors.textMuted }}>
                      <FileText size={48} style={{ opacity: 0.3 }} />
                      <span style={{ fontSize: 14 }}>
                        {search ? 'No se encontraron facturas' : 'Aún no hay facturas. Crea una desde el Punto de Venta.'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>
                      {item.numero_dte}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <TipoBadge tipo={item.tipo_dte} />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{item.cliente_nombre ?? '—'}</div>
                    {item.cliente_tipo && (
                      <div style={{ fontSize: 11, color: colors.textMuted }}>
                        {item.cliente_tipo === 'persona_natural' ? 'Persona Natural' : 'Empresa'}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: colors.textSecondary }}>
                    {fmtDate(item.fecha_emision)}
                  </td>
                  <td style={tdStyle}>
                    <EstadoBadge estado={item.estado} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: colors.textSecondary }}>
                    {Number(item.iva) > 0 ? fmtCur.format(Number(item.iva)) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                    {fmtCur.format(Number(item.total))}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 2 }}>
                      {/* Ver factura */}
                      <button
                        style={{ ...actionBtn, color: colors.textSecondary }}
                        title="Ver factura"
                        onClick={() => handleVerFactura(item.id)}
                        disabled={viewerLoading}
                      >
                        <Eye size={14} />
                      </button>
                      {/* Descargar JSON */}
                      <button
                        style={{ ...actionBtn, color: colors.textSecondary }}
                        title="Descargar JSON Hacienda"
                        onClick={() => handleDescargar(item)}
                      >
                        <Download size={14} />
                      </button>
                      {/* Marcar facturado */}
                      {item.estado === 'borrador' && (
                        <button
                          style={{ ...actionBtn, color: colors.success }}
                          title="Marcar como facturado"
                          onClick={() => setConfirmFacturado(item.id)}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {/* Cancelar */}
                      {item.estado !== 'cancelado' && (
                        <button
                          style={{ ...actionBtn, color: colors.danger }}
                          title="Cancelar factura"
                          onClick={() => setConfirmCancelar(item.id)}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1); }}
        />
      </div>

      {/* ── FacturaViewer modal ── */}
      {viewerData && (
        <FacturaViewer jsonPdf={viewerData} onClose={() => setViewerData(null)} />
      )}

      {/* ── Confirm: marcar facturado ── */}
      {confirmFacturado !== null && (
        <ConfirmDialog
          title="¿Marcar como Facturado?"
          message="Se cambiará el estado a 'Facturado'. Esta acción indica que el DTE fue enviado a Hacienda."
          loading={actionLoading}
          onConfirm={handleMarcarFacturado}
          onCancel={() => setConfirmFacturado(null)}
        />
      )}

      {/* ── Confirm: cancelar ── */}
      {confirmCancelar !== null && (
        <ConfirmDialog
          title="¿Cancelar esta factura?"
          message="Se cambiará el estado a 'Cancelado'. El inventario no se revertirá automáticamente."
          loading={actionLoading}
          onConfirm={handleCancelar}
          onCancel={() => setConfirmCancelar(null)}
        />
      )}
    </div>
  );
}

export default FacturacionList;
