/**
 * Categorias/config.tsx — Configuración de datos para el CRUD de Categorías.
 * Define columnas, campos de formulario, detalle y configuración general.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Para agregar una columna nueva a la tabla:
 *   1. Agrega el campo en la BD (database.ts)
 *   2. Agrega el campo en el modelo backend (categoria.model.ts)
 *   3. Agrega el campo en los tipos frontend (categoria.types.ts)
 *   4. Agrega la columna aquí en COLUMNS
 *   5. Agrega el campo en FIELDS (formulario)
 *   6. Agrega el campo en DETAIL_FIELDS (modal de detalle)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ColumnConfig, FieldConfig, EntityConfig, DetailField } from '../Common/types';
import { Categoria } from '../../types/categoria.types';
import { colors, radius } from '../../styles/colors';

// ── Utilidad: formatea un timestamp legible ───────────────────────────────────
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-SV', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
};

/**
 * COLUMNS: Define las columnas visibles en la tabla.
 *
 * La tabla muestra: # · Categoría
 * El # lo agrega DataTable automáticamente (no declarar aquí).
 * El detalle completo (timestamps) se accede por el botón ojo.
 */
export const COLUMNS: ColumnConfig<Categoria>[] = [
  {
    key:      'nombre',
    label:    'Categoría',
    sortable: true,
    render: (row) => (
      <span style={{ fontWeight: 500, color: colors.textPrimary }}>
        {row.nombre}
      </span>
    ),
  },
];

/**
 * FIELDS: Define los campos del formulario de crear/editar.
 * Cada objeto mapea exactamente a una propiedad del CreateCategoriaDTO.
 */
export const FIELDS: FieldConfig[] = [
  {
    name:        'nombre',
    label:       'Nombre de Categoría',
    type:        'text',
    required:    true,
    maxLength:   100,
    placeholder: 'Ej: Electrónica, Ropa, Alimentos...',
  },
];

/**
 * DETAIL_FIELDS: Campos mostrados en el modal de solo lectura (botón ojo).
 * Incluye campos adicionales como timestamps que no están en la tabla.
 */
export const DETAIL_FIELDS: DetailField<Categoria>[] = [
  {
    label:     'Nombre de Categoría',
    getValue:  (c) => (
      <span style={{
        display:         'inline-block',
        padding:         '4px 12px',
        borderRadius:    radius.sm,
        backgroundColor: colors.mutedBg,
        color:           colors.textPrimary,
        fontWeight:      600,
        fontSize:        '13px',
      }}>
        {c.nombre}
      </span>
    ),
    fullWidth: true,
  },
  {
    label:    'Fecha de Creación',
    getValue: (c) => formatDate(c.created_at),
  },
  {
    label:    'Última Actualización',
    getValue: (c) => formatDate(c.updated_at),
  },
];

/**
 * ENTITY_CONFIG: Textos de interfaz para el módulo.
 * Cambia aquí para ajustar etiquetas sin tocar los componentes.
 */
export const ENTITY_CONFIG: EntityConfig = {
  pageTitle:          'Gestión de Categorías',
  addButtonLabel:     'Nueva Categoría',
  searchPlaceholder:  'Buscar por nombre...',
  createModalTitle:   'Crear Nueva Categoría',
  editModalTitle:     'Editar Categoría',
  createSubmitLabel:  'Crear Categoría',
  editSubmitLabel:    'Guardar Cambios',
  deleteTitle:        '¿Eliminar categoría?',
  emptyMessage:       'No hay categorías registradas',
  emptySearchMessage: 'No se encontraron categorías',
};
