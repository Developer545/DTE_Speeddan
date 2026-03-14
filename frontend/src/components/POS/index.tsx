/**
 * POS/index.tsx — Módulo Punto de Venta.
 *
 * Flujo:
 *   1. Buscar y seleccionar cliente → determina tipo DTE automáticamente.
 *   2. Buscar productos (grid de tarjetas con imagen).
 *   3. Seleccionar tarjeta → ingresar cantidad y precio → agregar al carrito.
 *   4. Revisar carrito + Facturar.
 *   5. Pantalla de éxito con visualizador de factura y descarga JSON Hacienda.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Search, Plus, Trash2, FileText, RotateCcw,
  CheckCircle2, Download, Eye, X, ShoppingCart, User, Package,
  Users, UserCheck, Percent, Monitor, Building, Minus, Hash, AlertCircle, Clock
} from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { useFacturacion } from '../../hooks/useFacturacion';
import { clientesService } from '../../services/clientes.service';
import { productosService } from '../../services/productos.service';
import { inventarioService } from '../../services/inventario.service';
import { getLotesPorProducto, type LoteDisponible } from '../../services/facturacion.service';
import { getPuntosVenta, type PuntoVenta } from '../../services/config.service';
import { notify } from '../../utils/notify';
import { FacturaViewer } from '../Facturacion/FacturaViewer';
import type { Cliente } from '../../types/cliente.types';
import type { Producto } from '../../types/producto.types';
import * as facturacionService from '../../services/facturacion.service';

// ── Tipos internos ────────────────────────────────────────────────────────────

interface StockInfo {
  stock: number;
  vencimiento: string | null; // fecha más próxima entre los lotes
  precio: number;         // precio del lote más reciente
}

// ── Formatters ───────────────────────────────────────────────────────────────

const fmtCur = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });

// ── Estilos compartidos ───────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  fontSize: '13px',
  color: colors.textPrimary,
  background: colors.inputBg,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

// ⚠️  Sin overflow:hidden para que los dropdowns de búsqueda sean visibles
const card: React.CSSProperties = {
  background: colors.cardBg,
  borderRadius: radius.lg,
  border: `1px solid ${colors.border}`,
  boxShadow: shadow.card,
};

const cardHeader: React.CSSProperties = {
  padding: '14px 18px',
  borderBottom: `1px solid ${colors.border}`,
  background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const tdS: React.CSSProperties = {
  padding: '9px 12px',
  fontSize: '13px',
  color: colors.textPrimary,
  borderBottom: `1px solid ${colors.borderLight}`,
  verticalAlign: 'middle',
};

const thS: React.CSSProperties = {
  padding: '9px 12px',
  fontSize: '11px',
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
  borderBottom: `2px solid ${colors.border}`,
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

// ── Helpers de stock ─────────────────────────────────────────────────────────

/** Extrae solo "YYYY-MM-DD" de un ISO string o fecha pura */
function soloFecha(iso: string): string {
  return iso.split('T')[0];
}

function diasHastaVencer(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(soloFecha(fecha) + 'T12:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtFecha(iso: string): string {
  return new Date(soloFecha(iso) + 'T12:00:00').toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: '2-digit' });
}

function colorStock(stock: number): string {
  if (stock === 0) return colors.danger;
  if (stock <= 5) return '#f59e0b';
  return colors.success;
}

// ── Tarjeta de Producto ───────────────────────────────────────────────────────

interface ProductoCardProps {
  producto: Producto;
  stockInfo?: StockInfo;
  seleccionado: boolean;
  onClick: () => void;
}

function ProductoCard({ producto, stockInfo, seleccionado, onClick }: ProductoCardProps) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);

  const stock = stockInfo?.stock ?? null;
  const vence = stockInfo?.vencimiento ?? null;
  const diasVence = diasHastaVencer(vence);
  const sinStock = stock !== null && stock === 0;
  const stockColor = stock !== null ? colorStock(stock) : colors.textMuted;

  const vencColor = diasVence !== null && diasVence <= 30
    ? (diasVence <= 7 ? colors.danger : '#f59e0b')
    : 'rgba(255,255,255,0.80)';

  const vencLabel = vence
    ? (diasVence !== null && diasVence <= 0
      ? '⚠ Vencido'
      : diasVence !== null && diasVence <= 30
        ? `Vence ${diasVence}d`
        : fmtFecha(vence))
    : null;

  const hasImage = !!producto.imagen_url && !imgError;

  return (
    <div
      onClick={!sinStock ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: radius.md,
        border: seleccionado
          ? `2px solid ${colors.accent}`
          : `1px solid ${hover && !sinStock ? '#bbb' : colors.border}`,
        background: '#fff',
        cursor: sinStock ? 'not-allowed' : 'pointer',
        opacity: sinStock ? 0.55 : 1,
        transition: 'all 0.15s',
        boxShadow: seleccionado
          ? '0 4px 16px rgba(0,0,0,0.14)'
          : hover && !sinStock
            ? '0 4px 12px rgba(0,0,0,0.09)'
            : shadow.card,
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* ── Zona imagen ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4/3',
        background: colors.mutedBg,
        overflow: 'hidden',
      }}>
        {hasImage ? (
          <img
            src={producto.imagen_url!}
            alt={producto.nombre}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.2s',
              transform: hover && !sinStock ? 'scale(1.04)' : 'scale(1)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={32} color={colors.textMuted} style={{ opacity: 0.4 }} />
          </div>
        )}

        {/* Gradiente inferior para legibilidad de badges */}
        {hasImage && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Badge: vencimiento (esquina inferior izquierda, sobre la imagen) */}
        {vencLabel && (
          <div style={{
            position: 'absolute', bottom: 5, left: 6,
            fontSize: 9, fontWeight: 700,
            color: diasVence !== null && diasVence <= 30 ? '#fff' : 'rgba(255,255,255,0.9)',
            background: diasVence !== null && diasVence <= 7
              ? colors.danger
              : diasVence !== null && diasVence <= 30
                ? '#f59e0b'
                : 'rgba(0,0,0,0.45)',
            padding: '2px 6px',
            borderRadius: 9999,
            backdropFilter: 'blur(2px)',
            letterSpacing: '0.2px',
          }}>
            {vencLabel}
          </div>
        )}

        {/* Check de seleccionado (esquina superior derecha) */}
        {seleccionado && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            width: 22, height: 22, borderRadius: '50%',
            background: colors.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}>
            <Plus size={12} color="#fff" />
          </div>
        )}

        {/* Badge: sin stock (banner central) */}
        {sinStock && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.38)',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#fff',
              background: colors.danger,
              padding: '3px 10px', borderRadius: 9999,
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* ── Zona info ── */}
      <div style={{ padding: '9px 10px 10px' }}>
        {/* Nombre */}
        <div style={{
          fontSize: 12, fontWeight: 700, color: colors.textPrimary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3, marginBottom: 5,
        }}>
          {producto.nombre}
        </div>

        {/* Fila inferior: categoría + stock */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          {/* Categoría */}
          <span style={{
            fontSize: 9, fontWeight: 600,
            background: 'rgba(17,17,17,0.07)', color: colors.textSecondary,
            padding: '2px 6px', borderRadius: 9999,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '60%',
          }}>
            {producto.categoria_nombre ?? 'Sin cat.'}
          </span>

          {/* Stock */}
          {stock !== null && !sinStock && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 700, color: stockColor,
              flexShrink: 0,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: stockColor, display: 'inline-block', flexShrink: 0,
              }} />
              {Number(stock)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pantalla de éxito tras facturar ──────────────────────────────────────────

interface FacturaResumenProps { factura: any; onNuevo: () => void; }

function FacturaResumen({ factura, onNuevo }: FacturaResumenProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleDescargar = () => {
    const blob = new Blob([JSON.stringify(factura.json_dte, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${factura.numero_dte}_dte.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const RESUMEN_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    DTE_01: { label: 'Consumidor Final (DTE-01)', bg: colors.badgeNaturalBg, color: colors.badgeNaturalText },
    DTE_03: { label: 'Crédito Fiscal (DTE-03)', bg: colors.badgeEmpresaBg, color: colors.badgeEmpresaText },
    DTE_11: { label: 'Exportación (DTE-11)', bg: 'rgba(99,102,241,0.1)', color: '#4f46e5' },
  };
  const tipoBadge = RESUMEN_BADGE[factura.tipo_dte as string] ?? RESUMEN_BADGE.DTE_01;

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', background: colors.cardBg, borderRadius: radius.xl, border: `1px solid ${colors.border}`, boxShadow: shadow.modal, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: colors.accent, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <CheckCircle2 size={40} color="#fff" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Factura Generada Correctamente</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>El DTE fue guardado en <strong>jsonDTE/</strong> del servidor</div>
          </div>
        </div>

        {/* Datos */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Número DTE</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{factura.numero_dte}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Tipo</div>
              <span style={{ background: tipoBadge.bg, color: tipoBadge.color, padding: '3px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>{tipoBadge.label}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Cliente</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{factura.factura?.cliente_nombre ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Fecha</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                {factura.factura?.fecha_emision
                  ? new Date(soloFecha(factura.factura.fecha_emision) + 'T12:00:00').toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: '14px 18px', background: colors.mutedBg, borderRadius: radius.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Total facturado</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>{fmtCur.format(Number(factura.factura?.total ?? 0))}</span>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ padding: '20px 32px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setViewerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: colors.accent, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <Eye size={15} /> Ver Factura
          </button>
          <button onClick={handleDescargar} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: 'none', color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={15} /> JSON Hacienda
          </button>
          <button onClick={onNuevo} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: 'none', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <RotateCcw size={15} /> Nueva Venta
          </button>
        </div>
      </div>

      {viewerOpen && factura.json_pdf && (
        <FacturaViewer jsonPdf={factura.json_pdf} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}

// ── Pantalla de selección de terminal ────────────────────────────────────────

interface TerminalSelectorProps {
  onSelect: (pv: PuntoVenta) => void;
}

function TerminalSelector({ onSelect }: TerminalSelectorProps) {
  const [pvList, setPvList] = useState<PuntoVenta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPuntosVenta()
      .then(list => setPvList(list.filter(pv => pv.activo)))
      .catch(() => notify.error('No se pudieron cargar los puntos de venta'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: '100%', background: colors.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 40,
    }}>
      <div style={{
        background: colors.cardBg,
        borderRadius: radius.xl,
        border: `1px solid ${colors.border}`,
        boxShadow: shadow.modal,
        width: '100%', maxWidth: 520,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: colors.accent, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Monitor size={28} color="#fff" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Seleccionar Terminal</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              Elige la terminal (punto de venta) desde la que vas a facturar
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: 24 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: colors.textMuted, padding: 32 }}>
              Cargando terminales...
            </div>
          )}

          {!loading && pvList.length === 0 && (
            <div style={{ textAlign: 'center', color: colors.textMuted, padding: 24, fontSize: 14 }}>
              <Monitor size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
              No hay terminales activas.<br />
              <span style={{ fontSize: 12 }}>Ve a <strong>Configuración → Sucursales</strong> para agregar puntos de venta.</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pvList.map(pv => (
              <button
                key={pv.id}
                onClick={() => onSelect(pv)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  background: colors.inputBg,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${colors.accent}`;
                  (e.currentTarget as HTMLButtonElement).style.background = `${colors.accent}08`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${colors.border}`;
                  (e.currentTarget as HTMLButtonElement).style.background = colors.inputBg;
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: radius.md,
                  background: colors.mutedBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Monitor size={20} color={colors.textSecondary} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{pv.nombre}</div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building size={11} />
                    {pv.sucursal_nombre ?? 'Sucursal'}
                    <span style={{ fontFamily: 'monospace', background: colors.badgeEmpresaBg, padding: '1px 7px', borderRadius: 9999, color: colors.badgeEmpresaText, fontSize: 11 }}>
                      {pv.prefijo}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: colors.accent, fontWeight: 600 }}>
                  Seleccionar →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Historial del Día ─────────────────────────────────────────────────────────

interface HistorialPanelProps {
  onClose: () => void;
  puntoVentaId: number;
}

const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transf.',
  otro:          'Mixto/Otro',
};

function HistorialPanel({ onClose, puntoVentaId }: HistorialPanelProps) {
  const [facturas,      setFacturas]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [procesando,    setProcesando]    = useState<number | null>(null);
  // ID de la factura pendiente de confirmar devolución (null = ninguna)
  const [confirmarId,   setConfirmarId]   = useState<number | null>(null);

  const cargarFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const resp = await facturacionService.listarFacturas('', 1, 100, hoy, puntoVentaId);
      setFacturas(resp.data);
    } catch {
      notify.error('Error al cargar el historial del día');
    } finally {
      setLoading(false);
    }
  }, [puntoVentaId]);

  useEffect(() => { cargarFacturas(); }, [cargarFacturas]);

  const ejecutarDevolucion = async (id: number) => {
    setProcesando(id);
    setConfirmarId(null);
    try {
      await facturacionService.crearDevolucion(id);
      notify.success('Devolución procesada — stock restaurado al inventario');
      cargarFacturas();
    } catch (err: any) {
      notify.error(err.message ?? 'Error al procesar devolución');
    } finally {
      setProcesando(null);
    }
  };

  // ── Resumen diario calculado del lado del cliente ──────────────────────────
  const facturadas = facturas.filter(f => f.estado === 'facturado' && f.tipo_dte !== 'DTE_06');
  const totalDia   = facturadas.reduce((s, f) => s + Number(f.total), 0);

  // Breakdown por método de pago
  const porMetodo = facturadas.reduce<Record<string, number>>((acc, f) => {
    const m = f.metodo_pago || 'otro';
    acc[m] = (acc[m] ?? 0) + Number(f.total);
    return acc;
  }, {});

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 460,
      background: colors.cardBg, borderLeft: `1px solid ${colors.border}`,
      boxShadow: '-4px 0 20px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column',
      zIndex: 100, animation: 'slideIn 0.25s ease-out',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color={colors.accent} /> Historial del Día
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={cargarFacturas}
            title="Refrescar"
            style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '5px 8px', cursor: 'pointer', color: colors.textSecondary, display: 'flex' }}
          >
            <RotateCcw size={13} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Resumen diario */}
      {!loading && facturadas.length > 0 && (
        <div style={{ padding: '14px 20px', background: `${colors.accent}08`, borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total del día
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: colors.accent }}>
              {fmtCur.format(totalDia)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(porMetodo).map(([m, total]) => (
              <span key={m} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 999,
                background: `${colors.accent}15`, color: colors.accent, fontWeight: 600,
              }}>
                {METODO_PAGO_LABEL[m] ?? m}: {fmtCur.format(total)}
              </span>
            ))}
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 999,
              background: colors.mutedBg, color: colors.textMuted, fontWeight: 600,
            }}>
              {facturadas.length} factura{facturadas.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Lista de facturas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', backgroundColor: colors.pageBg }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textMuted, fontSize: 13 }}>
            Cargando facturas...
          </div>
        ) : facturas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textMuted }}>
            <Clock size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>No hay facturas emitidas hoy en esta terminal.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {facturas.map(f => {
              const esCancelada   = f.estado === 'cancelado';
              const esDevolucion  = f.tipo_dte === 'DTE_06';
              const puedeDevolver = f.estado === 'facturado' && !esDevolucion;
              const confirmando   = confirmarId === f.id;
              const procesandoEsta = procesando === f.id;

              return (
                <div key={f.id} style={{
                  background: colors.cardBg,
                  borderRadius: radius.md,
                  border: `1px solid ${esCancelada ? colors.danger + '40' : esDevolucion ? '#f59e0b40' : colors.border}`,
                  padding: '14px 16px',
                  opacity: esCancelada ? 0.7 : 1,
                }}>
                  {/* Cabecera */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                        {f.numero_dte || `Borrador #${f.id}`}
                      </div>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {f.cliente_nombre || 'Consumidor Final'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: esCancelada ? colors.textMuted : colors.textPrimary }}>
                        {fmtCur.format(Number(f.total))}
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: f.estado === 'facturado' ? '#10b981'
                          : f.estado === 'cancelado' ? colors.danger
                          : colors.textMuted,
                      }}>
                        {esDevolucion ? 'NC / Dev.' : f.estado}
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.borderLight}` }}>
                    <div style={{ fontSize: 11, color: colors.textMuted, display: 'flex', gap: 8 }}>
                      <span>{f.tipo_dte}</span>
                      <span>•</span>
                      <span style={{ textTransform: 'capitalize' }}>{METODO_PAGO_LABEL[f.metodo_pago] ?? f.metodo_pago ?? 'N/A'}</span>
                    </div>

                    {puedeDevolver && !confirmando && (
                      <button
                        onClick={() => setConfirmarId(f.id)}
                        disabled={procesandoEsta}
                        style={{
                          background: 'none', border: `1px solid ${colors.danger}`, color: colors.danger,
                          borderRadius: radius.sm, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          opacity: procesandoEsta ? 0.5 : 1,
                        }}
                      >
                        <RotateCcw size={11} /> Devolver
                      </button>
                    )}
                  </div>

                  {/* Confirmación inline — reemplaza window.confirm() */}
                  {confirmando && (
                    <div style={{
                      marginTop: 10, padding: '10px 12px',
                      background: '#fef2f2', borderRadius: radius.sm,
                      border: `1px solid ${colors.danger}40`,
                    }}>
                      <p style={{ margin: '0 0 10px', fontSize: 12, color: colors.danger, fontWeight: 600 }}>
                        ¿Confirmar devolución?
                      </p>
                      <p style={{ margin: '0 0 10px', fontSize: 11, color: colors.textSecondary, lineHeight: 1.5 }}>
                        Se generará una Nota de Crédito (DTE_06) y el stock de los productos volverá al inventario.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => ejecutarDevolucion(f.id)}
                          disabled={procesandoEsta}
                          style={{
                            flex: 1, padding: '7px 0', background: colors.danger, color: '#fff',
                            border: 'none', borderRadius: radius.sm, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {procesandoEsta ? 'Procesando...' : 'Sí, devolver'}
                        </button>
                        <button
                          onClick={() => setConfirmarId(null)}
                          style={{
                            flex: 1, padding: '7px 0', background: 'none', color: colors.textSecondary,
                            border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal POS ──────────────────────────────────────────────────

export default function POS() {
  const pos = useFacturacion();

  // ── Terminal activa (Punto de Venta) ─────────────────────────────────────
  const [terminalSel, setTerminalSel] = useState<PuntoVenta | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // ── Nuevo estado para Cambio (Vuelto) ──
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const montoRecibidoNum = parseFloat(montoRecibido) || 0;
  const vuelto = montoRecibidoNum - pos.total;

  const seleccionarTerminal = (pv: PuntoVenta) => {
    setTerminalSel(pv);
    pos.setPuntoVentaId(pv.id);
  };

  // ── Cliente (modo C) ──
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState<Cliente[]>([]);
  const [clienteLoading, setClienteLoading] = useState(false);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const clienteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Productos ──
  const [productoQuery, setProductoQuery] = useState('');
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [productoLoading, setProductoLoading] = useState(false);
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const [stockMap, setStockMap] = useState<Map<number, StockInfo>>(new Map());
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('');
  const [descuento, setDescuento] = useState('0');  // descuento por unidad ($)
  const productoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Lotes ──
  const [lotes, setLotes] = useState<LoteDisponible[]>([]);
  const [loteSel, setLoteSel] = useState<LoteDisponible | null>(null);
  const [lotesLoading, setLotesLoading] = useState(false);

  // ── Resultado factura ──
  const [facturaCreada, setFacturaCreada] = useState<any>(null);

  // ── Buscar clientes ──
  const buscarClientes = useCallback((q: string) => {
    clearTimeout(clienteTimer.current);
    if (!q.trim()) { setClienteResults([]); setClienteLoading(false); return; }
    setClienteLoading(true);
    clienteTimer.current = setTimeout(async () => {
      try {
        const res = await clientesService.getAll({ search: q, page: 1, limit: 8 });
        setClienteResults(res.data);
      } catch { /* silencioso */ } finally { setClienteLoading(false); }
    }, 300);
  }, []);

  // ── Buscar productos + stock en paralelo ──
  const buscarProductos = useCallback((q: string) => {
    clearTimeout(productoTimer.current);
    if (!q.trim()) { setProductoResults([]); setStockMap(new Map()); setProductoLoading(false); return; }
    setProductoLoading(true);
    productoTimer.current = setTimeout(async () => {
      try {
        const [prodRes, invRes] = await Promise.all([
          productosService.getAll({ search: q, page: 1, limit: 12 }),
          inventarioService.getAll({ search: q, limit: 100 }),
        ]);

        // Agregar inventario por producto_id (suma lotes, venc. más próxima, precio más reciente)
        const mapa = new Map<number, StockInfo>();
        for (const row of invRes.data) {
          const pid = row.producto_id;
          const prev = mapa.get(pid);
          const stock = (prev?.stock ?? 0) + Number(row.cantidad);

          // Vencimiento más próximo (ignorar nulls, priorizar fechas más cercanas)
          let vencimiento = prev?.vencimiento ?? null;
          if (row.fecha_vencimiento) {
            if (!vencimiento || row.fecha_vencimiento < vencimiento) {
              vencimiento = row.fecha_vencimiento;
            }
          }

          mapa.set(pid, { stock, vencimiento, precio: Number(row.precio_unitario) });
        }

        setProductoResults(prodRes.data);
        setStockMap(mapa);
      } catch { /* silencioso */ } finally { setProductoLoading(false); }
    }, 300);
  }, []);

  // Mientras no hay terminal seleccionada, mostrar pantalla de selección
  if (!terminalSel) {
    return <TerminalSelector onSelect={seleccionarTerminal} />;
  }

  // ── Modo de receptor (A=Anónimo, B=Transitorio, C=Registrado) ──
  // El modo se mantiene en el hook useFacturacion, pero el POS lo propaga
  const modoActual = pos.receptorModo;

  const seleccionarCliente = (c: Cliente) => {
    setClienteSel(c);
    pos.setClienteId(c.id);
    pos.setTipoCliente(c.tipo_cliente);
    pos.setTipoDTEOverride(null);  // resetear override al cambiar de cliente
    setClienteQuery('');
    setClienteResults([]);
  };

  const deseleccionarCliente = () => {
    setClienteSel(null);
    pos.limpiarCarrito();
    setProductoSel(null);
    setProductoQuery('');
    setProductoResults([]);
    setStockMap(new Map());
    setCantidad('1');
    setPrecio('');
    setDescuento('0');
    setLotes([]);
    setLoteSel(null);
  };

  const seleccionarProducto = async (p: Producto) => {
    const esToggle = productoSel?.id === p.id;
    if (esToggle) {
      setProductoSel(null);
      setCantidad('1');
      setPrecio('');
      setLotes([]);
      setLoteSel(null);
      return;
    }
    setProductoSel(p);
    setCantidad('1');
    setDescuento('0');

    // Cargar lotes disponibles y pre-seleccionar el de mayor vencimiento
    setLotesLoading(true);
    setLotes([]);
    setLoteSel(null);
    try {
      const lotesRes = await getLotesPorProducto(p.id);
      setLotes(lotesRes);
      // Primer elemento = vence más luego (orden del backend: DESC NULLS FIRST)
      const porDefecto = lotesRes[0] ?? null;
      setLoteSel(porDefecto);
      setPrecio(porDefecto ? String(porDefecto.precio_unitario) : '');
    } catch {
      // Si falla, usar precio del stockMap
      const info = stockMap.get(p.id);
      setPrecio(info?.precio ? String(info.precio) : '');
    } finally {
      setLotesLoading(false);
    }
  };

  const agregarAlCarrito = () => {
    if (!productoSel) return;
    const cant = parseFloat(cantidad);
    const prec = parseFloat(precio);
    const desc = parseFloat(descuento) || 0;
    if (isNaN(cant) || cant <= 0 || isNaN(prec) || prec <= 0) return;
    pos.agregarLinea({
      producto_id: productoSel.id,
      producto_nombre: productoSel.nombre,
      cantidad: cant,
      precio_unitario: prec,
      descuento: desc > 0 ? desc : undefined,
      lote: loteSel?.lote ?? null,
    });
    setProductoSel(null);
    setCantidad('1');
    setPrecio('');
    setDescuento('0');
    setLotes([]);
    setLoteSel(null);
  };

  const handleCrearFactura = async () => {
    try {
      const resp = await pos.crearFactura();
      setFacturaCreada(resp);
    } catch { /* error ya en pos.error */ }
  };

  const handleNuevo = () => {
    setFacturaCreada(null);
    setClienteSel(null);
    setClienteQuery('');
    setProductoSel(null);
    setProductoQuery('');
    setProductoResults([]);
    setCantidad('1');
    setPrecio('');
    setDescuento('0');
  };

  // ── Pantalla de éxito ──
  if (facturaCreada) {
    return <FacturaResumen factura={facturaCreada} onNuevo={handleNuevo} />;
  }

  // Badge del tipo DTE — muestra el tipo activo (auto o manual)
  const DTE_BADGE_MAP: Record<string, { label: string; bg: string; color: string }> = {
    DTE_01: { label: 'DTE-01 · Consumidor Final', bg: colors.badgeNaturalBg, color: colors.badgeNaturalText },
    DTE_03: { label: 'DTE-03 · Crédito Fiscal', bg: colors.badgeEmpresaBg, color: colors.badgeEmpresaText },
    DTE_11: { label: 'DTE-11 · Exportación', bg: 'rgba(99,102,241,0.1)', color: '#4f46e5' },
  };
  const tipoBadge = DTE_BADGE_MAP[pos.tipoDTE] ?? DTE_BADGE_MAP.DTE_01;

  // Modo A: siempre listo para agregar productos
  // Modo B: requiere receptor_nombre
  // Modo C: requiere cliente seleccionado
  const receptorConfigurado = modoActual === 'A'
    || (modoActual === 'B' && pos.receptorNombre.trim() !== '')
    || (modoActual === 'C' && !!clienteSel);

  const canFacturar = pos.lineas.length > 0
    && receptorConfigurado
    && !pos.isLoading
    && (pos.metodoPago !== 'efectivo' || montoRecibidoNum >= pos.total);

  const canAdd = !!productoSel && parseFloat(precio) > 0 && parseFloat(cantidad) > 0;

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
          <h1 style={{ fontSize: 21, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px', margin: 0 }}>
            Punto de Venta
          </h1>
          <span style={{ background: tipoBadge.bg, color: tipoBadge.color, padding: '3px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
            {tipoBadge.label}
          </span>
          {/* Botones Derecha */}
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            {terminalSel && (
              <button
                onClick={() => setMostrarHistorial(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: radius.sm,
                  background: '#fff', border: `1px solid ${colors.border}`,
                  color: colors.textSecondary, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Clock size={16} /> Historial del Día
              </button>
            )}
            {/* Terminal activa — clic para cambiar */}
            <button
              onClick={() => {
                setTerminalSel(null);
                pos.limpiarCarrito();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                background: colors.inputBg,
                cursor: 'pointer',
                fontSize: 12, color: colors.textSecondary,
              }}
              title="Cambiar terminal"
            >
              <Monitor size={13} />
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#4f46e5' }}>
                {terminalSel.prefijo}
              </span>
              <span>{terminalSel.nombre}</span>
              <X size={11} style={{ opacity: 0.6 }} />
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 0 14px' }}>
          Facturación electrónica · DTE El Salvador
        </p>
      </div>

      {/* ── Layout dos columnas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, alignItems: 'start' }}>

        {/* ─── Columna izquierda ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Sección: Receptor ── */}
          <div style={card}>
            <div style={cardHeader}>
              <User size={15} color={colors.textSecondary} />
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Receptor</span>
            </div>
            <div style={{ padding: 18 }}>

              {/* Selector de modo — 3 opciones */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {([
                  { modo: 'A' as const, label: 'Clientes Varios', Icon: Users, desc: 'Venta anónima' },
                  { modo: 'B' as const, label: 'Con nombre', Icon: User, desc: 'Sin registrar' },
                  { modo: 'C' as const, label: 'Registrado', Icon: UserCheck, desc: 'Base de datos' },
                ]).map(({ modo, label, Icon, desc }) => {
                  const active = modoActual === modo;
                  return (
                    <button key={modo} type="button"
                      onClick={() => {
                        pos.setReceptorModo(modo);
                        // Al cambiar modo limpiar selección de cliente si era C
                        if (modo !== 'C' && clienteSel) deseleccionarCliente();
                      }}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        padding: '8px 6px',
                        border: `2px solid ${active ? colors.accent : colors.border}`,
                        borderRadius: radius.md,
                        background: active ? `${colors.accent}10` : colors.inputBg,
                        color: active ? colors.accent : colors.textSecondary,
                        cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 500,
                        transition: 'all 0.12s',
                      }}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>{desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Modo A: mensaje informativo */}
              {modoActual === 'A' && (
                <div style={{
                  padding: '10px 14px', background: colors.mutedBg,
                  borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                  fontSize: 13, color: colors.textSecondary,
                }}>
                  Venta anónima — el DTE se emitirá con receptor "Consumidor Final".
                </div>
              )}

              {/* Modo B: inputs de nombre + correo */}
              {modoActual === 'B' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Nombre <span style={{ color: colors.danger }}>*</span>
                    </label>
                    <input
                      style={inputBase}
                      placeholder="Nombre del receptor..."
                      value={pos.receptorNombre}
                      onChange={e => pos.setReceptorNombre(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Correo (opcional)
                    </label>
                    <input
                      type="email"
                      style={inputBase}
                      placeholder="correo@ejemplo.com"
                      value={pos.receptorCorreo}
                      onChange={e => pos.setReceptorCorreo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Modo C: búsqueda de cliente registrado */}
              {modoActual === 'C' && (
                clienteSel ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Card del cliente seleccionado */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: colors.mutedBg,
                      borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{clienteSel.nombre_completo}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                          {clienteSel.tipo_documento} {clienteSel.numero_documento}
                          {clienteSel.telefono ? ` · ${clienteSel.telefono}` : ''}
                        </div>
                      </div>
                      <button onClick={deseleccionarCliente} title="Cambiar cliente" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 4, display: 'flex' }}>
                        <X size={16} />
                      </button>
                    </div>

                    {/* Selector de tipo DTE — por defecto auto, pero editable por transacción */}
                    <div>
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: colors.textMuted,
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <FileText size={11} />
                        Tipo de documento
                        {pos.tipoDTEOverride === null && (
                          <span style={{ fontSize: 10, color: colors.accent, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                            · auto según cliente
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {([
                          { tipo: 'DTE_01' as const, label: 'DTE-01', desc: 'Consumidor Final' },
                          { tipo: 'DTE_03' as const, label: 'DTE-03', desc: 'Crédito Fiscal' },
                          { tipo: 'DTE_11' as const, label: 'DTE-11', desc: 'Exportación' },
                        ]).map(({ tipo, label, desc }) => {
                          const esActual = pos.tipoDTE === tipo;
                          const esAuto = pos.tipoDTEAuto === tipo && pos.tipoDTEOverride === null;
                          return (
                            <button
                              key={tipo}
                              type="button"
                              onClick={() => pos.setTipoDTEOverride(tipo === pos.tipoDTEAuto ? null : tipo)}
                              style={{
                                flex: 1,
                                padding: '7px 6px',
                                border: `2px solid ${esActual ? colors.accent : colors.border}`,
                                borderRadius: radius.sm,
                                background: esActual ? `${colors.accent}10` : colors.inputBg,
                                color: esActual ? colors.accent : colors.textSecondary,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: esActual ? 700 : 400,
                                textAlign: 'center',
                                transition: 'all 0.12s',
                                position: 'relative',
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>{label}</div>
                              <div style={{ fontSize: 10, opacity: 0.8 }}>{desc}</div>
                              {/* Indicador de "por defecto" del cliente */}
                              {esAuto && (
                                <div style={{
                                  position: 'absolute', top: -5, right: -5,
                                  width: 10, height: 10, borderRadius: '50%',
                                  background: colors.accent,
                                  border: '1.5px solid #fff',
                                }} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {pos.tipoDTEOverride !== null && (
                        <button
                          type="button"
                          onClick={() => pos.setTipoDTEOverride(null)}
                          style={{ marginTop: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: colors.textMuted, padding: 0, textDecoration: 'underline' }}
                        >
                          Restaurar al predeterminado del cliente
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
                      <input
                        style={{ ...inputBase, paddingLeft: 32 }}
                        placeholder="Buscar cliente por nombre o documento..."
                        value={clienteQuery}
                        onChange={e => { setClienteQuery(e.target.value); buscarClientes(e.target.value); }}
                      />
                      {clienteLoading && (
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: colors.textMuted }}>
                          Buscando...
                        </span>
                      )}
                    </div>
                    {clienteResults.length > 0 && (
                      <div style={{ marginTop: 6, border: `1px solid ${colors.border}`, borderRadius: radius.sm, background: '#fff', boxShadow: shadow.card, maxHeight: 220, overflowY: 'auto' }}>
                        {clienteResults.map(c => (
                          <div key={c.id} onClick={() => seleccionarCliente(c)}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${colors.borderLight}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{c.nombre_completo}</div>
                            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                              {c.tipo_documento} {c.numero_documento}
                              {' · '}
                              {c.tipo_cliente === 'persona_natural' ? 'Persona Natural (DTE-01)' : 'Empresa (DTE-03)'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── Sección: Productos (visible cuando el receptor está configurado) ── */}
          {receptorConfigurado && (
            <div style={card}>
              <div style={cardHeader}>
                <Package size={15} color={colors.textSecondary} />
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Productos</span>
                {productoResults.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>
                    {productoResults.length} encontrado{productoResults.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ padding: 18 }}>

                {/* Input de búsqueda */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
                  <input
                    style={{ ...inputBase, paddingLeft: 32 }}
                    placeholder="Buscar producto por nombre..."
                    value={productoQuery}
                    onChange={e => {
                      setProductoQuery(e.target.value);
                      if (productoSel) { setProductoSel(null); setCantidad('1'); setPrecio(''); }
                      buscarProductos(e.target.value);
                    }}
                  />
                  {productoLoading && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: colors.textMuted }}>
                      Buscando...
                    </span>
                  )}
                </div>

                {/* Grid de tarjetas */}
                {productoResults.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 12,
                    maxHeight: 360,
                    overflowY: 'auto',
                    paddingRight: 2,
                    marginBottom: productoSel ? 14 : 0,
                  }}>
                    {productoResults.map(p => (
                      <div key={p.id} style={{ position: 'relative' }}>
                        <ProductoCard
                          producto={p}
                          stockInfo={stockMap.get(p.id)}
                          seleccionado={productoSel?.id === p.id}
                          onClick={() => seleccionarProducto(p)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Placeholder cuando no hay búsqueda */}
                {!productoLoading && productoQuery === '' && productoResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: colors.textMuted }}>
                    <Package size={36} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.25 }} />
                    <div style={{ fontSize: 13 }}>Escribe para buscar productos</div>
                  </div>
                )}

                {/* Sin resultados */}
                {!productoLoading && productoQuery !== '' && productoResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: colors.textMuted, fontSize: 13 }}>
                    No se encontraron productos para "{productoQuery}"
                  </div>
                )}

                {/* Formulario: lote + cantidad + precio tras seleccionar tarjeta */}
                {productoSel && (
                  <div style={{
                    marginTop: 12,
                    padding: '14px 16px',
                    background: colors.mutedBg,
                    borderRadius: radius.sm,
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, marginBottom: 12 }}>
                      {productoSel.nombre}
                      {productoSel.categoria_nombre && (
                        <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 8, fontWeight: 400 }}>
                          {productoSel.categoria_nombre}
                        </span>
                      )}
                    </div>

                    {/* ── Selector de lote ── */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Lote de inventario
                      </label>

                      {lotesLoading && (
                        <div style={{ fontSize: 12, color: colors.textMuted, padding: '6px 0' }}>Cargando lotes...</div>
                      )}

                      {!lotesLoading && lotes.length === 0 && (
                        <div style={{ fontSize: 12, color: colors.danger, padding: '6px 0' }}>Sin stock disponible</div>
                      )}

                      {!lotesLoading && lotes.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {lotes.map((l) => {
                            const diasV = diasHastaVencer(l.fecha_vencimiento);
                            const vColor = diasV !== null && diasV <= 7
                              ? colors.danger
                              : diasV !== null && diasV <= 30
                                ? '#f59e0b'
                                : colors.textMuted;
                            const vLabel = l.fecha_vencimiento
                              ? (diasV !== null && diasV <= 0 ? '⚠ Vencido'
                                : diasV !== null && diasV <= 30 ? `Vence en ${diasV}d`
                                  : fmtFecha(l.fecha_vencimiento!))
                              : 'Sin vencimiento';

                            const isSelected = loteSel?.id === l.id;
                            return (
                              <div
                                key={l.id}
                                onClick={() => { setLoteSel(l); setPrecio(String(l.precio_unitario)); }}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  borderRadius: radius.sm,
                                  border: isSelected ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                  background: isSelected ? 'rgba(17,17,17,0.04)' : '#fff',
                                  cursor: 'pointer',
                                  transition: 'all 0.12s',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {/* Radio visual */}
                                  <div style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                                    background: isSelected ? colors.accent : 'transparent',
                                    flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {isSelected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>
                                      {l.lote ? `Lote ${l.lote}` : 'Sin lote'}
                                      {isSelected && <span style={{ marginLeft: 6, fontSize: 10, color: colors.textMuted, fontWeight: 400 }}>(por defecto)</span>}
                                    </div>
                                    <div style={{ fontSize: 11, color: vColor, fontWeight: diasV !== null && diasV <= 30 ? 600 : 400 }}>
                                      {vLabel}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: 11 }}>
                                  <div style={{ color: colorStock(l.cantidad), fontWeight: 700 }}>{Number(l.cantidad)} uds</div>
                                  <div style={{ color: colors.textMuted }}>{fmtCur.format(l.precio_unitario)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Cantidad
                        </label>
                        <input
                          type="number" min="0.001" step="0.001"
                          style={inputBase}
                          value={cantidad}
                          onChange={e => setCantidad(e.target.value)}
                          placeholder="1"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Precio Unit. (USD)
                        </label>
                        <input
                          type="number" min="0.01" step="0.01"
                          style={inputBase}
                          value={precio}
                          onChange={e => setPrecio(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        {/* Descuento por unidad — montoDescu en DTE */}
                        <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Dscto / Unit.
                        </label>
                        <input
                          type="number" min="0" step="0.01"
                          style={inputBase}
                          value={descuento}
                          onChange={e => setDescuento(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <button
                      onClick={agregarAlCarrito}
                      disabled={!canAdd}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        padding: '9px 0',
                        background: canAdd ? colors.accent : '#d1d1d1',
                        color: '#fff', border: 'none', borderRadius: radius.md,
                        fontSize: 14, fontWeight: 600,
                        cursor: canAdd ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Plus size={15} /> Agregar al Carrito
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Columna derecha: Carrito ─── */}
        <div style={card}>
          <div style={cardHeader}>
            <ShoppingCart size={15} color={colors.textSecondary} />
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Carrito</span>
            {pos.lineas.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textMuted }}>
                {pos.lineas.length} ítem{pos.lineas.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Tabla */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Producto', 'Cant.', 'Precio', 'Dscto', 'Total', ''].map(h => (
                    <th key={h} style={{ ...thS, textAlign: h === '' ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.lineas.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...tdS, textAlign: 'center', padding: '40px 16px', color: colors.textMuted }}>
                      <ShoppingCart size={36} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.25 }} />
                      <div style={{ fontSize: 13 }}>El carrito está vacío</div>
                    </td>
                  </tr>
                )}
                {pos.lineas.map((linea, idx) => {
                  const dsc = linea.descuento ?? 0;
                  const neto = (linea.precio_unitario - dsc) * linea.cantidad;
                  return (
                    <tr key={idx} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ ...tdS, maxWidth: 120 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {linea.producto_nombre}
                        </div>
                        {linea.lote && (
                          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>Lote: {linea.lote}</div>
                        )}
                      </td>
                      <td style={{ ...tdS, width: 60 }}>
                        <input type="number" min="0.001" step="0.001"
                          value={linea.cantidad}
                          onChange={e => pos.actualizarLinea(idx, { ...linea, cantidad: parseFloat(e.target.value) || 0 })}
                          style={{ ...inputBase, width: 54, padding: '5px 6px', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ ...tdS, width: 80 }}>
                        <input type="number" min="0.01" step="0.01"
                          value={linea.precio_unitario}
                          onChange={e => pos.actualizarLinea(idx, { ...linea, precio_unitario: parseFloat(e.target.value) || 0 })}
                          style={{ ...inputBase, width: 72, padding: '5px 6px', textAlign: 'right' }}
                        />
                      </td>
                      {/* Descuento por unidad editable en carrito */}
                      <td style={{ ...tdS, width: 72 }}>
                        <input type="number" min="0" step="0.01"
                          value={dsc || ''}
                          placeholder="0"
                          onChange={e => pos.actualizarLinea(idx, { ...linea, descuento: parseFloat(e.target.value) || 0 })}
                          style={{ ...inputBase, width: 64, padding: '5px 6px', textAlign: 'right', color: dsc > 0 ? '#d97706' : undefined }}
                        />
                      </td>
                      <td style={{ ...tdS, width: 88, fontWeight: 600 }}>
                        {fmtCur.format(neto)}
                        {dsc > 0 && (
                          <div style={{ fontSize: 10, color: '#d97706' }}>-{fmtCur.format(dsc * linea.cantidad)}</div>
                        )}
                      </td>
                      <td style={{ ...tdS, textAlign: 'center', width: 32 }}>
                        <button onClick={() => pos.eliminarLinea(idx)} title="Eliminar"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, padding: 4, display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales + Opciones + Notas + Botón */}
          {pos.lineas.length > 0 && (
            <div style={{ padding: '14px 18px', borderTop: `1px solid ${colors.border}`, background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                {/* Subtotal bruto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.textSecondary }}>
                  <span>Subtotal</span>
                  <span>{fmtCur.format(pos.subtotalBruto)}</span>
                </div>

                {/* Descuento total — solo si hay descuentos */}
                {pos.totalDescuento > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#d97706' }}>
                    <span>Descuento</span>
                    <span>-{fmtCur.format(pos.totalDescuento)}</span>
                  </div>
                )}

                {/* IVA — solo DTE_03 */}
                {pos.tipoDTE === 'DTE_03' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.textSecondary }}>
                    <span>IVA (13%)</span>
                    <span>{fmtCur.format(pos.iva)}</span>
                  </div>
                )}

                {/* Toggle Gran Contribuyente — solo DTE_03 */}
                {pos.tipoDTE === 'DTE_03' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', background: pos.granContribuyente ? '#fffbeb' : '#f9f9f9',
                    borderRadius: radius.sm, border: `1px solid ${pos.granContribuyente ? '#fcd34d' : colors.border}`,
                    marginTop: 4,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>
                      <input
                        type="checkbox"
                        checked={pos.granContribuyente}
                        onChange={e => pos.setGranContribuyente(e.target.checked)}
                        style={{ width: 14, height: 14, cursor: 'pointer' }}
                      />
                      <Percent size={12} />
                      Gran Contribuyente (retención ISR 1%)
                    </label>
                    {pos.granContribuyente && (
                      <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                        -{fmtCur.format(pos.retencionRenta)}
                      </span>
                    )}
                  </div>
                )}

                {/* Total final */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 17, fontWeight: 800, color: colors.textPrimary, paddingTop: 8, borderTop: `1px solid ${colors.border}`, marginTop: 4 }}>
                  <span>Total</span>
                  <span>{fmtCur.format(pos.total)}</span>
                </div>
              </div>

              <textarea
                style={{ ...inputBase, marginTop: 14, resize: 'vertical', minHeight: 52 }}
                placeholder="Notas (opcional)..."
                value={pos.notas ?? ''}
                onChange={e => pos.setNotas(e.target.value)}
              />

              {/* ── Selector de Método de Pago ── */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  Método de Pago
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { val: 'efectivo' as const, label: 'Efectivo' },
                    { val: 'tarjeta' as const, label: 'Tarjeta' },
                    { val: 'transferencia' as const, label: 'Transf.' },
                    { val: 'otro' as const, label: 'Mixto/Otro' }
                  ].map(m => {
                    const active = pos.metodoPago === m.val;
                    return (
                      <button
                        key={m.val}
                        onClick={() => pos.setMetodoPago(m.val)}
                        style={{
                          padding: '8px 4px',
                          border: `1px solid ${active ? colors.accent : colors.border}`,
                          background: active ? `${colors.accent}15` : colors.inputBg,
                          color: active ? colors.accent : colors.textSecondary,
                          borderRadius: radius.sm,
                          fontSize: 12,
                          fontWeight: active ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Cálculo de Vuelto (solo para Efectivo) ── */}
              {pos.metodoPago === 'efectivo' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recibido
                    </label>
                    <input
                      type="number"
                      style={{ ...inputBase, fontSize: 14, fontWeight: 600 }}
                      value={montoRecibido}
                      onChange={e => setMontoRecibido(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', paddingTop: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Cambio
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: vuelto >= 0 ? '#10b981' : colors.danger }}>
                      {fmtCur.format(vuelto >= 0 ? vuelto : 0)}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleCrearFactura}
                disabled={!canFacturar}
                style={{
                  marginTop: 10, width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 0',
                  background: canFacturar ? colors.accent : '#c8c8c8',
                  color: '#fff', border: 'none', borderRadius: radius.md,
                  fontSize: 15, fontWeight: 700,
                  cursor: canFacturar ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.2px',
                }}
              >
                <FileText size={17} />
                {pos.isLoading ? 'Procesando...' : 'Facturar'}
              </button>

              {!receptorConfigurado && pos.lineas.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                  {modoActual === 'B' ? 'Ingresa el nombre del receptor para facturar'
                    : modoActual === 'C' ? 'Selecciona un cliente para facturar'
                      : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel Lateral de Historial */}
        {mostrarHistorial && terminalSel && (
          <HistorialPanel onClose={() => setMostrarHistorial(false)} puntoVentaId={terminalSel.id} />
        )}
      </div>
    </div>
  );
}
