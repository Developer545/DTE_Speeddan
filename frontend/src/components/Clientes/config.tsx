/**
 * Clientes/config.tsx — Configuración de datos para el CRUD de Clientes.
 * Define columnas, campos de formulario y configuración general.
 */

import { ColumnConfig, FieldConfig, EntityConfig, DetailField } from '../Common/types';
import { Cliente, CreateClienteDTO } from '../../types/cliente.types';
import { colors, radius } from '../../styles/colors';
import { getDepartamentos, getMunicipios } from '../../services/catalog.service';

/**
 * COLUMNS: Define las columnas de la tabla.
 * Orden: Define el orden en que aparecen.
 * render: Función custom para renderizar celdas especiales (ej: badges).
 */
export const COLUMNS: ColumnConfig<Cliente>[] = [
  {
    key: 'tipo_cliente',
    label: 'Tipo',
    sortable: false,
    render: (row) => {
      const isEmpresa = row.tipo_cliente === 'empresa';
      const bgColor = isEmpresa ? colors.badgeEmpresaBg : colors.badgeNaturalBg;
      const textColor = isEmpresa ? colors.badgeEmpresaText : colors.badgeNaturalText;
      const label = isEmpresa ? 'Empresa' : 'Persona Natural';

      return (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: radius.sm,
            backgroundColor: bgColor,
            color: textColor,
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          {label}
        </span>
      );
    },
  },
  {
    key: 'nombre_completo',
    label: 'Nombre',
    sortable: true,
  },
  {
    key: 'tipo_documento',
    label: 'Tipo Doc.',
    sortable: false,
    render: (row) => (
      <span
        style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: radius.sm,
          backgroundColor: colors.mutedBg,
          color: colors.textSecondary,
          fontSize: '12px',
          fontWeight: '500',
        }}
      >
        {row.tipo_documento}
      </span>
    ),
  },
  {
    key: 'numero_documento',
    label: 'N° Documento',
    sortable: false,
  },
  {
    key: 'telefono',
    label: 'Teléfono',
    sortable: false,
  },
];

/**
 * FIELDS: Define los campos del formulario de crear/editar.
 * type: text, email, tel, select, textarea
 * required: Si es obligatorio
 * options: Para campos select (tipo_cliente, tipo_documento)
 */
export const FIELDS: FieldConfig[] = [
  {
    name: 'tipo_cliente',
    label: 'Tipo de Cliente',
    type: 'select',
    required: true,
    options: [
      { value: 'persona_natural', label: 'Persona Natural' },
      { value: 'empresa', label: 'Empresa' },
    ],
  },
  {
    name: 'nombre_completo',
    label: 'Nombre Completo',
    type: 'text',
    required: true,
    placeholder: 'Ej: Juan Pérez García',
  },
  {
    name: 'tipo_documento',
    label: 'Tipo de Documento',
    type: 'select',
    required: true,
    options: [
      { value: 'DUI', label: 'DUI' },
      { value: 'Pasaporte', label: 'Pasaporte' },
      { value: 'Otro', label: 'Otro' },
    ],
  },
  {
    name: 'numero_documento',
    label: 'Número de Documento',
    type: 'text',
    required: true,
    placeholder: 'Ej: 12345678-9',
  },
  {
    name: 'direccion',
    label: 'Dirección',
    type: 'textarea',
    required: false,
    placeholder: 'Ej: Calle Principal #123, Apto 4B',
  },
  {
    name: 'telefono',
    label: 'Teléfono',
    type: 'tel',
    required: false,
    placeholder: 'Ej: +503 2345 6789',
  },
  {
    name: 'correo',
    label: 'Correo Electrónico',
    type: 'email',
    required: false,
    placeholder: 'Ej: juan@example.com',
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
 * DETAIL_FIELDS: Campos que se muestran en el modal de detalle (botón ojo).
 * Incluye todos los campos, incluso los que no se muestran en la tabla.
 */
export const DETAIL_FIELDS: DetailField<Cliente>[] = [
  {
    label: 'Tipo de Cliente',
    getValue: (c) => {
      const isEmpresa = c.tipo_cliente === 'empresa';
      return (
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: '6px',
          backgroundColor: isEmpresa ? 'rgba(99,102,241,0.1)' : 'rgba(6,182,212,0.1)',
          color: isEmpresa ? '#4f46e5' : '#0891b2',
          fontSize: '12px', fontWeight: 600,
        }}>
          {isEmpresa ? 'Empresa' : 'Persona Natural'}
        </span>
      );
    },
  },
  {
    label: 'Nombre Completo',
    getValue: (c) => c.nombre_completo,
  },
  {
    label: 'Nombre Comercial',
    getValue: (c) => c.nombre_comercial ?? null,
  },
  {
    label: 'Tipo de Documento',
    getValue: (c) => (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '6px',
        backgroundColor: colors.mutedBg,
        color: colors.textSecondary,
        fontSize: '12px', fontWeight: 600,
      }}>
        {c.tipo_documento}
      </span>
    ),
  },
  {
    label: 'N° Documento',
    getValue: (c) => c.numero_documento,
  },
  {
    label: 'NIT',
    getValue: (c) => c.nit ?? null,
  },
  {
    label: 'NRC',
    getValue: (c) => c.ncr ?? null,
  },
  {
    label: 'Giro / Actividad',
    getValue: (c) => c.giro ?? null,
  },
  {
    label: 'Teléfono',
    getValue: (c) => c.telefono ?? null,
  },
  {
    label: 'Correo Electrónico',
    getValue: (c) => c.correo ?? null,
  },
  {
    label: 'Departamento',
    getValue: (c) => c.departamento_nombre ?? null,
  },
  {
    label: 'Municipio',
    getValue: (c) => c.municipio_nombre ?? null,
  },
  {
    label: 'Dirección',
    getValue: (c) => c.direccion ?? null,
    fullWidth: true,
  },
];

/**
 * ENTITY_CONFIG: Configuración general de la entidad.
 */
export const ENTITY_CONFIG: EntityConfig = {
  pageTitle: 'Gestión de Clientes',
  addButtonLabel: 'Nuevo Cliente',
  searchPlaceholder: 'Buscar por nombre o documento...',
  createModalTitle: 'Crear Nuevo Cliente',
  editModalTitle: 'Editar Cliente',
  createSubmitLabel: 'Crear Cliente',
  editSubmitLabel: 'Guardar Cambios',
  deleteTitle: '¿Eliminar cliente?',
  emptyMessage: 'No hay clientes registrados',
  emptySearchMessage: 'No se encontraron clientes',
};
