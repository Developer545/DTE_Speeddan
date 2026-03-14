/**
 * Productos/config.tsx — Configuración de columnas, campos y textos para Productos.
 *
 * Para agregar un campo nuevo:
 *   1. Agrega la columna en database.ts + producto.model.ts (backend)
 *   2. Agrega el campo en CreateProductoDTO (producto.types.ts)
 *   3. Agrega la entrada en FIELDS aquí
 *   4. (Opcional) Agrega una entrada en DETAIL_FIELDS para el modal de detalle
 */

import React from 'react';
import type { ColumnConfig, EntityConfig, FieldConfig } from '../Common/types';
import type { DetailField } from '../Common/types';
import type { Producto } from '../../types/producto.types';
import type { FieldOption } from '../Common/types';
import { colors, radius } from '../../styles/colors';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Las imágenes usan rutas relativas (/uploads/productos/...) para que el proxy
// de Vite las redirija al backend automáticamente sin hardcodear el puerto.

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Columnas de la tabla ──────────────────────────────────────────────────────

export const COLUMNS: ColumnConfig<Producto>[] = [
  {
    key: 'imagen_url',
    label: 'Imagen',
    render: (p) =>
      p.imagen_url ? (
        <img
          src={p.imagen_url}
          alt={p.nombre}
          style={{
            width: '40px', height: '40px',
            objectFit: 'cover',
            borderRadius: radius.sm,
            border: `1px solid ${colors.border}`,
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          width: '40px', height: '40px',
          borderRadius: radius.sm,
          background: colors.mutedBg,
          border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          📦
        </div>
      ),
  },
  {
    key: 'nombre',
    label: 'Nombre',
    sortable: true,
  },
  {
    key: 'categoria_nombre',
    label: 'Categoría',
    render: (p) =>
      p.categoria_nombre ? (
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(17,17,17,0.07)',
          color: colors.textSecondary,
          letterSpacing: '0.2px',
        }}>
          {p.categoria_nombre}
        </span>
      ) : (
        <span style={{ color: colors.textMuted, fontSize: '13px' }}>Sin categoría</span>
      ),
  },
  {
    key: 'created_at',
    label: 'Creado',
    muted: true,
    render: (p) => (
      <span style={{ fontSize: '12px', color: colors.textMuted }}>
        {formatDate(p.created_at)}
      </span>
    ),
  },
];

// ── Campos del formulario ─────────────────────────────────────────────────────

/**
 * Genera el array de campos del formulario.
 * Recibe `catOptions` para poblar el select de categoría dinámicamente.
 */
export function buildFields(catOptions: FieldOption[]): FieldConfig[] {
  return [
    {
      name:        'nombre',
      label:       'Nombre del Producto',
      type:        'text',
      required:    true,
      maxLength:   200,
      placeholder: 'Ej: Arroz Diana 5kg',
    },
    {
      name:    'categoria_id',
      label:   'Categoría',
      type:    'select',
      options: [
        { value: '', label: '— Sin categoría —' },
        ...catOptions,
      ],
    },
    {
      name:   'imagen',
      label:  'Imagen del Producto',
      type:   'file',
      accept: 'image/jpeg,image/png,image/svg+xml,image/webp',
    },
  ];
}

// ── Campos del modal de detalle ───────────────────────────────────────────────

export const DETAIL_FIELDS: DetailField<Producto>[] = [
  {
    label:    'Nombre',
    getValue: (p) => p.nombre,
    fullWidth: true,
  },
  {
    label:    'Categoría',
    getValue: (p) => p.categoria_nombre ?? '—',
  },
  {
    label: 'Imagen',
    getValue: (p) =>
      p.imagen_url ? (
        <img
          src={p.imagen_url}
          alt={p.nombre}
          style={{
            width: '100%', maxWidth: '200px', height: 'auto',
            objectFit: 'cover',
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
          }}
        />
      ) : (
        <span style={{ color: colors.textMuted }}>Sin imagen</span>
      ),
    fullWidth: true,
  },
  {
    label:    'Fecha de creación',
    getValue: (p) => formatDate(p.created_at),
  },
  {
    label:    'Última actualización',
    getValue: (p) => formatDate(p.updated_at),
  },
];

// ── Textos de la interfaz ─────────────────────────────────────────────────────

export const ENTITY_CONFIG: EntityConfig = {
  pageTitle:          'Productos',
  addButtonLabel:     'Nuevo Producto',
  searchPlaceholder:  'Buscar por nombre...',
  createModalTitle:   'Nuevo Producto',
  editModalTitle:     'Editar Producto',
  createSubmitLabel:  'Crear Producto',
  editSubmitLabel:    'Guardar Cambios',
  deleteTitle:        'Eliminar Producto',
  emptyMessage:       'No hay productos registrados',
  emptySearchMessage: 'No se encontraron productos',
};
