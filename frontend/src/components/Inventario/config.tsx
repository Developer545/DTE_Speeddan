/**
 * Inventario/config.tsx — Configuración de columnas para el módulo Inventario.
 * Solo lectura — no tiene formulario de creación/edición.
 */

import React from 'react';
import { ColumnConfig, EntityConfig } from '../Common/types';
import { Inventario } from '../../types/inventario.types';

const fmt = new Intl.DateTimeFormat('es-SV', {
  year: 'numeric', month: 'short', day: 'numeric',
});

function formatDate(val: string | null): string {
  if (!val) return '—';
  return fmt.format(new Date(val));
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const COLUMNS: ColumnConfig<Inventario>[] = [
  {
    key: 'producto_nombre',
    label: 'Producto',
    sortable: true,
  },
  {
    key: 'categoria_nombre',
    label: 'Categoría',
    sortable: false,
    render: (item) => item.categoria_nombre ?? <span style={{ color: '#9b9b9b' }}>—</span>,
  },
  {
    key: 'lote',
    label: 'Lote',
    sortable: false,
    render: (item) => item.lote ?? <span style={{ color: '#9b9b9b' }}>—</span>,
  },
  {
    key: 'fecha_vencimiento',
    label: 'Vencimiento',
    sortable: false,
    render: (item) => {
      if (!item.fecha_vencimiento) return <span style={{ color: '#9b9b9b' }}>—</span>;
      const days = daysUntil(item.fecha_vencimiento);
      const color = days !== null && days < 30 ? '#f59e0b' : '#111111';
      return (
        <span style={{ color, fontWeight: days !== null && days < 30 ? '600' : '400' }}>
          {formatDate(item.fecha_vencimiento)}
          {days !== null && days < 30 && ` (${days}d)`}
        </span>
      );
    },
  },
  {
    key: 'cantidad',
    label: 'Stock',
    sortable: false,
    render: (item) => {
      const sinStock = Number(item.cantidad) === 0;
      return (
        <span
          style={{
            fontWeight: '700',
            color: sinStock ? '#ef4444' : '#111111',
          }}
        >
          {Number(item.cantidad)}
        </span>
      );
    },
  },
];

export const ENTITY_CONFIG: EntityConfig = {
  pageTitle:          'Inventario',
  addButtonLabel:     '',
  searchPlaceholder:  'Buscar por nombre de producto...',
  createModalTitle:   '',
  editModalTitle:     '',
  createSubmitLabel:  '',
  editSubmitLabel:    '',
  deleteTitle:        '',
  emptyMessage:       'No hay registros en inventario',
  emptySearchMessage: 'No se encontraron productos en inventario',
};
