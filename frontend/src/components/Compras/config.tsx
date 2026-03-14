/**
 * Compras/config.tsx — Columnas de la tabla de compras.
 * Una fila = un producto comprado (línea de compra).
 */

import React from 'react';
import { CompraLineaRow } from '../../types/compra.types';
import { colors } from '../../styles/colors';

const fmtDate = new Intl.DateTimeFormat('es-SV', {
  year: 'numeric', month: 'short', day: 'numeric',
});

function formatDate(val: string | null): React.ReactNode {
  if (!val) return <span style={{ color: colors.textMuted }}>—</span>;
  try { return fmtDate.format(new Date(val)); }
  catch { return val; }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export interface ColumnDef {
  key:     string;
  label:   string;
  render:  (row: CompraLineaRow) => React.ReactNode;
}

export const COLUMNS: ColumnDef[] = [
  {
    key:   'orden_compra',
    label: 'Orden de Compra',
    render: (row) => (
      <span style={{
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: '13px',
        background: colors.inputBg,
        padding: '3px 8px',
        borderRadius: '6px',
        color: colors.textPrimary,
        letterSpacing: '0.5px',
      }}>
        {row.orden_compra}
      </span>
    ),
  },
  {
    key:   'producto_nombre',
    label: 'Producto',
    render: (row) => (
      <span style={{ fontWeight: 500, color: colors.textPrimary }}>{row.producto_nombre}</span>
    ),
  },
  {
    key:   'cantidad',
    label: 'Cantidad',
    render: (row) => (
      <span style={{ fontWeight: 700, color: colors.textPrimary }}>
        {Number(row.cantidad)}
      </span>
    ),
  },
  {
    key:   'lote',
    label: 'Lote',
    render: (row) => row.lote
      ? <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.lote}</span>
      : <span style={{ color: colors.textMuted }}>—</span>,
  },
  {
    key:   'fecha_vencimiento',
    label: 'Vencimiento',
    render: (row) => {
      if (!row.fecha_vencimiento) return <span style={{ color: colors.textMuted }}>—</span>;
      const days = daysUntil(row.fecha_vencimiento);
      const warn = days !== null && days < 30;
      return (
        <span style={{ color: warn ? '#f59e0b' : colors.textPrimary, fontWeight: warn ? 600 : 400 }}>
          {formatDate(row.fecha_vencimiento)}
          {warn && <span style={{ fontSize: '11px', marginLeft: '4px' }}>({days}d)</span>}
        </span>
      );
    },
  },
];

export const PAGE_TITLE         = 'Compras';
export const SEARCH_PLACEHOLDER = 'Buscar por proveedor o producto...';
