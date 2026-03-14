/**
 * empleados.service.ts — Llamadas a la API REST para Empleados.
 */

import api from './api';
import {
  Empleado, CreateEmpleadoDTO, UpdateEmpleadoDTO, PaginatedEmpleados,
} from '../types/empleado.types';

interface ListParams {
  search?: string;
  page?:   number;
  limit?:  number;
}

export const empleadosService = {
  /** Lista paginada y filtrada */
  getAll: (params: ListParams = {}): Promise<PaginatedEmpleados> =>
    api.get('/empleados', { params }).then(r => r.data),

  /** Crear nuevo empleado */
  create: (dto: CreateEmpleadoDTO): Promise<Empleado> =>
    api.post('/empleados', dto).then(r => r.data),

  /** Actualizar empleado existente */
  update: (id: number, dto: UpdateEmpleadoDTO): Promise<Empleado> =>
    api.put(`/empleados/${id}`, dto).then(r => r.data),

  /** Eliminar empleado */
  delete: (id: number): Promise<void> =>
    api.delete(`/empleados/${id}`).then(() => undefined),
};
