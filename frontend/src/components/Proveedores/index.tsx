/**
 * Proveedores/index.tsx — Página CRUD de Proveedores.
 * Thin wrapper que orquesta el flujo usando ListPage y la configuración.
 */

import { useCallback, useMemo } from 'react';
import { TruckIcon } from 'lucide-react';
import { ListPage } from '../Common';
import { useGenericCRUD } from '../../hooks/useGenericCRUD';
import { proveedoresService } from '../../services/proveedores.service';
import { Proveedor, CreateProveedorDTO } from '../../types/proveedor.types';
import { COLUMNS, FIELDS, ENTITY_CONFIG, DETAIL_FIELDS } from './config';

/**
 * ProveedoresList — Componente principal de gestión de proveedores.
 * Delega toda la lógica a ListPage y los hooks genéricos.
 */
export function ProveedoresList() {
  const crud = useGenericCRUD<Proveedor, CreateProveedorDTO>(proveedoresService);

  // Memoizados para evitar re-renders innecesarios en ListPage
  const toFormValues = useCallback((proveedor: Proveedor): Record<string, unknown> => ({
    nombre:          proveedor.nombre,
    nit:             proveedor.nit           || '',
    ncr:             proveedor.ncr           || '',
    direccion:       proveedor.direccion     || '',
    telefono:        proveedor.telefono      || '',
    correo:          proveedor.correo        || '',
    departamento_id: proveedor.departamento_id ? String(proveedor.departamento_id) : '',
    municipio_id:    proveedor.municipio_id    ? String(proveedor.municipio_id)    : '',
  }), []);

  const createDefaults = useMemo<Record<string, unknown>>(() => ({
    nombre:          '',
    nit:             '',
    ncr:             '',
    direccion:       '',
    telefono:        '',
    correo:          '',
    departamento_id: '',
    municipio_id:    '',
  }), []);

  return (
    <ListPage<Proveedor, CreateProveedorDTO>
      config={ENTITY_CONFIG}
      columns={COLUMNS}
      fields={FIELDS}
      emptyIcon={<TruckIcon size={48} />}
      useData={() => crud}
      toFormValues={toFormValues}
      createDefaults={createDefaults}
      detailFields={DETAIL_FIELDS}
      detailTitle={(p) => p.nombre}
    />
  );
}

export default ProveedoresList;
