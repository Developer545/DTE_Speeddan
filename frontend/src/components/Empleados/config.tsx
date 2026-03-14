/**
 * Empleados/config.tsx — Configuración de datos para el CRUD de Empleados.
 * Define columnas, campos de formulario, detalle y configuración general.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Para agregar una columna nueva a la tabla:
 *   1. Agrega el campo en la BD (database.ts)
 *   2. Agrega el campo en el modelo backend (empleado.model.ts)
 *   3. Agrega el campo en los tipos frontend (empleado.types.ts)
 *   4. Agrega la columna aquí en COLUMNS
 *   5. Agrega el campo en FIELDS (formulario crear/editar)
 *   6. Agrega el campo en DETAIL_FIELDS (modal de detalle)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ColumnConfig, FieldConfig, EntityConfig, DetailField } from '../Common/types';
import { Empleado } from '../../types/empleado.types';
import { colors, radius } from '../../styles/colors';
import { getDepartamentos, getMunicipios } from '../../services/catalog.service';

/**
 * COLUMNS: Define las columnas visibles en la tabla.
 *
 * La tabla muestra: # · Nombre · Tipo Doc. · N° Documento · Teléfono
 * Dirección y correo se ven en el modal de detalle (botón ojo).
 */
export const COLUMNS: ColumnConfig<Empleado>[] = [
  {
    key:      'nombre_completo',
    label:    'Nombre',
    sortable: true,
  },
  {
    key:      'tipo_documento',
    label:    'Tipo Doc.',
    sortable: false,
    render: (row) => (
      <span
        style={{
          display:         'inline-block',
          padding:         '3px 10px',
          borderRadius:    radius.sm,
          backgroundColor: colors.mutedBg,
          color:           colors.textSecondary,
          fontSize:        '12px',
          fontWeight:      '500',
        }}
      >
        {row.tipo_documento}
      </span>
    ),
  },
  {
    key:      'numero_documento',
    label:    'N° Documento',
    sortable: false,
  },
  {
    key:      'telefono',
    label:    'Teléfono',
    sortable: false,
  },
];

/**
 * FIELDS: Define los campos del formulario de crear/editar.
 * Cada objeto mapea exactamente a una propiedad del CreateEmpleadoDTO.
 */
export const FIELDS: FieldConfig[] = [
  {
    name:        'nombre_completo',
    label:       'Nombre Completo',
    type:        'text',
    required:    true,
    placeholder: 'Ej: María García López',
  },
  {
    name:     'tipo_documento',
    label:    'Tipo de Documento',
    type:     'select',
    required: true,
    options: [
      { value: 'DUI',       label: 'DUI' },
      { value: 'Pasaporte', label: 'Pasaporte' },
      { value: 'Otro',      label: 'Otro' },
    ],
  },
  {
    name:        'numero_documento',
    label:       'Número de Documento',
    type:        'text',
    required:    true,
    placeholder: 'Ej: 12345678-9',
  },
  {
    name:        'direccion',
    label:       'Dirección',
    type:        'textarea',
    required:    false,
    placeholder: 'Ej: Calle Principal #123, Apto 4B',
  },
  {
    name:        'telefono',
    label:       'Teléfono',
    type:        'tel',
    required:    false,
    placeholder: 'Ej: +503 2345 6789',
  },
  {
    name:        'correo',
    label:       'Correo Electrónico',
    type:        'email',
    required:    false,
    placeholder: 'Ej: maria@empresa.com',
  },
  {
    name:         'departamento_id',
    label:        'Departamento',
    type:         'select',
    required:     false,
    loadOptions:  () => getDepartamentos().then(deps =>
      deps.map(d => ({ value: String(d.id), label: d.nombre }))
    ),
  },
  {
    name:              'municipio_id',
    label:             'Municipio',
    type:              'select',
    required:          false,
    dependsOn:         'departamento_id',
    loadOptionsByDep:  (depId) => getMunicipios(Number(depId)).then(muns =>
      muns.map(m => ({ value: String(m.id), label: m.nombre }))
    ),
  },
];

/**
 * DETAIL_FIELDS: Campos mostrados en el modal de solo lectura (botón ojo).
 * Incluye dirección y correo que no se muestran en la tabla principal.
 */
export const DETAIL_FIELDS: DetailField<Empleado>[] = [
  {
    label:    'Nombre Completo',
    getValue: (e) => e.nombre_completo,
    fullWidth: true,
  },
  {
    label:    'Tipo de Documento',
    getValue: (e) => (
      <span style={{
        display:         'inline-block',
        padding:         '3px 10px',
        borderRadius:    radius.sm,
        backgroundColor: colors.mutedBg,
        color:           colors.textSecondary,
        fontSize:        '12px',
        fontWeight:      600,
      }}>
        {e.tipo_documento}
      </span>
    ),
  },
  {
    label:    'N° Documento',
    getValue: (e) => e.numero_documento,
  },
  {
    label:    'Teléfono',
    getValue: (e) => e.telefono ?? null,
  },
  {
    label:    'Correo Electrónico',
    getValue: (e) => e.correo ?? null,
  },
  {
    label:    'Departamento',
    getValue: (e) => e.departamento_nombre ?? null,
  },
  {
    label:    'Municipio',
    getValue: (e) => e.municipio_nombre ?? null,
  },
  {
    label:     'Dirección',
    getValue:  (e) => e.direccion ?? null,
    fullWidth: true,
  },
];

/**
 * ENTITY_CONFIG: Textos de interfaz para el módulo.
 * Cambia aquí para ajustar etiquetas sin tocar los componentes.
 */
export const ENTITY_CONFIG: EntityConfig = {
  pageTitle:          'Gestión de Empleados',
  addButtonLabel:     'Nuevo Empleado',
  searchPlaceholder:  'Buscar por nombre o documento...',
  createModalTitle:   'Crear Nuevo Empleado',
  editModalTitle:     'Editar Empleado',
  createSubmitLabel:  'Crear Empleado',
  editSubmitLabel:    'Guardar Cambios',
  deleteTitle:        '¿Eliminar empleado?',
  emptyMessage:       'No hay empleados registrados',
  emptySearchMessage: 'No se encontraron empleados',
};
