/**
 * Proveedores/config.tsx — Configuración de datos para el CRUD de Proveedores.
 * Define columnas, campos de formulario y configuración general.
 */

import { ColumnConfig, FieldConfig, EntityConfig, DetailField } from '../Common/types';
import { Proveedor, CreateProveedorDTO } from '../../types/proveedor.types';
import { colors, radius } from '../../styles/colors';
import { getDepartamentos, getMunicipios } from '../../services/catalog.service';

/**
 * COLUMNS: Define las columnas de la tabla.
 */
export const COLUMNS: ColumnConfig<Proveedor>[] = [
  {
    key: 'nombre',
    label: 'Nombre de Proveedor',
    sortable: true,
  },
  {
    key: 'nit',
    label: 'NIT',
    sortable: false,
  },
  {
    key: 'ncr',
    label: 'NCR',
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
 */
export const FIELDS: FieldConfig[] = [
  {
    name: 'nombre',
    label: 'Nombre de Proveedor',
    type: 'text',
    required: true,
    placeholder: 'Ej: Distribuidora El Mundo',
  },
  {
    name: 'nit',
    label: 'NIT',
    type: 'text',
    required: false,
    placeholder: 'Ej: 1234567-8',
  },
  {
    name: 'ncr',
    label: 'NCR',
    type: 'text',
    required: false,
    placeholder: 'Ej: 12345',
  },
  {
    name: 'direccion',
    label: 'Dirección',
    type: 'textarea',
    required: false,
    placeholder: 'Ej: Avenida Principal #456, Zona Industrial',
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
    placeholder: 'Ej: contacto@proveedor.com',
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
 * ENTITY_CONFIG: Configuración general de la entidad.
 */
export const ENTITY_CONFIG: EntityConfig = {
  pageTitle: 'Gestión de Proveedores',
  addButtonLabel: 'Nuevo Proveedor',
  searchPlaceholder: 'Buscar por nombre o NIT...',
  createModalTitle: 'Crear Nuevo Proveedor',
  editModalTitle: 'Editar Proveedor',
  createSubmitLabel: 'Crear Proveedor',
  editSubmitLabel: 'Guardar Cambios',
  deleteTitle: '¿Eliminar proveedor?',
  emptyMessage: 'No hay proveedores registrados',
  emptySearchMessage: 'No se encontraron proveedores',
};

/**
 * DETAIL_FIELDS: Campos que se muestran en el modal de detalle (botón ojo).
 */
export const DETAIL_FIELDS: DetailField<Proveedor>[] = [
  {
    label: 'Nombre de Proveedor',
    getValue: (p) => p.nombre,
  },
  {
    label: 'NIT',
    getValue: (p) => p.nit ?? null,
  },
  {
    label: 'NCR',
    getValue: (p) => p.ncr ?? null,
  },
  {
    label: 'Teléfono',
    getValue: (p) => p.telefono ?? null,
  },
  {
    label: 'Correo Electrónico',
    getValue: (p) => p.correo ?? null,
  },
  {
    label: 'Departamento',
    getValue: (p) => p.departamento_nombre ?? null,
  },
  {
    label: 'Municipio',
    getValue: (p) => p.municipio_nombre ?? null,
  },
  {
    label: 'Dirección',
    getValue: (p) => p.direccion ?? null,
    fullWidth: true,
  },
];
