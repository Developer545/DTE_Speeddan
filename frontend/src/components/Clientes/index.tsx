/**
 * Clientes/index.tsx — Página CRUD de Clientes.
 * Thin wrapper que orquesta el flujo usando ListPage + ClienteForm personalizado.
 *
 * Usa ClienteForm (en lugar de GenericForm) para formularios con campos
 * condicionales según tipo_cliente (persona_natural vs empresa).
 */

import { useCallback, useMemo } from 'react';
import { Users } from 'lucide-react';
import { ListPage } from '../Common';
import { useGenericCRUD } from '../../hooks/useGenericCRUD';
import { clientesService } from '../../services/clientes.service';
import { Cliente, CreateClienteDTO } from '../../types/cliente.types';
import { COLUMNS, FIELDS, ENTITY_CONFIG, DETAIL_FIELDS } from './config';
import { ClienteForm } from './ClienteForm';

/**
 * ClientesList — Componente principal de gestión de clientes.
 */
export function ClientesList() {
  const crud = useGenericCRUD<Cliente, CreateClienteDTO>(clientesService);

  // Convierte un cliente existente a los valores del formulario de edición
  const toFormValues = useCallback((cliente: Cliente): Record<string, unknown> => ({
    tipo_cliente:     cliente.tipo_cliente,
    nombre_completo:  cliente.nombre_completo,
    tipo_documento:   cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    nit:              cliente.nit             || '',
    ncr:              cliente.ncr             || '',
    nombre_comercial: cliente.nombre_comercial || '',
    giro:             cliente.giro            || '',
    direccion:        cliente.direccion       || '',
    telefono:         cliente.telefono        || '',
    correo:           cliente.correo          || '',
    departamento_id:  cliente.departamento_id ? String(cliente.departamento_id) : '',
    municipio_id:     cliente.municipio_id    ? String(cliente.municipio_id)    : '',
  }), []);

  const createDefaults = useMemo<Record<string, unknown>>(() => ({
    tipo_cliente:     'persona_natural',
    nombre_completo:  '',
    tipo_documento:   'DUI',
    numero_documento: '',
    nit:              '',
    ncr:              '',
    nombre_comercial: '',
    giro:             '',
    direccion:        '',
    telefono:         '',
    correo:           '',
    departamento_id:  '',
    municipio_id:     '',
  }), []);

  return (
    <ListPage<Cliente, CreateClienteDTO>
      config={ENTITY_CONFIG}
      columns={COLUMNS}
      fields={FIELDS}
      emptyIcon={<Users size={48} />}
      useData={() => crud}
      toFormValues={toFormValues}
      createDefaults={createDefaults}
      detailFields={DETAIL_FIELDS}
      detailTitle={(c) => c.nombre_completo}
      customFormComponent={ClienteForm}
    />
  );
}

export default ClientesList;
