/**
 * Empleados/index.tsx — Página CRUD de Empleados.
 *
 * Thin wrapper que orquesta el flujo usando ListPage y la configuración.
 * Para modificar columnas, campos o textos: editar solo config.tsx.
 * Para cambiar la lógica de datos: editar useGenericCRUD.ts o empleadosService.
 */

import { useCallback, useMemo } from 'react';
import { UserCheck } from 'lucide-react';
import { ListPage } from '../Common';
import { useGenericCRUD } from '../../hooks/useGenericCRUD';
import { empleadosService } from '../../services/empleados.service';
import { Empleado, CreateEmpleadoDTO } from '../../types/empleado.types';
import { COLUMNS, FIELDS, ENTITY_CONFIG, DETAIL_FIELDS } from './config';

/**
 * EmpleadosList — Componente principal de gestión de empleados.
 * Delega toda la lógica a ListPage y los hooks genéricos.
 */
export function EmpleadosList() {
  const crud = useGenericCRUD<Empleado, CreateEmpleadoDTO>(empleadosService);

  // Memoizados para evitar re-renders innecesarios en ListPage
  const toFormValues = useCallback((empleado: Empleado): Record<string, unknown> => ({
    nombre_completo:  empleado.nombre_completo,
    tipo_documento:   empleado.tipo_documento,
    numero_documento: empleado.numero_documento,
    direccion:        empleado.direccion       || '',
    telefono:         empleado.telefono        || '',
    correo:           empleado.correo          || '',
    departamento_id:  empleado.departamento_id ? String(empleado.departamento_id) : '',
    municipio_id:     empleado.municipio_id    ? String(empleado.municipio_id)    : '',
  }), []);

  const createDefaults = useMemo<Record<string, unknown>>(() => ({
    nombre_completo:  '',
    tipo_documento:   'DUI',
    numero_documento: '',
    direccion:        '',
    telefono:         '',
    correo:           '',
    departamento_id:  '',
    municipio_id:     '',
  }), []);

  return (
    <ListPage<Empleado, CreateEmpleadoDTO>
      config={ENTITY_CONFIG}
      columns={COLUMNS}
      fields={FIELDS}
      emptyIcon={<UserCheck size={48} />}
      useData={() => crud}
      toFormValues={toFormValues}
      createDefaults={createDefaults}
      detailFields={DETAIL_FIELDS}
      detailTitle={(e) => e.nombre_completo}
    />
  );
}

export default EmpleadosList;
