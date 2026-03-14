/**
 * Productos/index.tsx — Página CRUD de Productos.
 *
 * Diferencias respecto a otros módulos:
 *   - Carga categorías dinámicamente para el select del formulario.
 *   - Usa `imagen` (File) en el DTO — el servicio construye FormData automáticamente.
 *   - Al editar, el campo imagen queda vacío (el usuario puede subir una nueva).
 *     Si no sube nada, el servidor conserva la imagen existente.
 *
 * Para modificar columnas, campos o textos: editar solo config.tsx.
 * Para cambiar la lógica de datos: editar useGenericCRUD.ts o productosService.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { ListPage } from '../Common';
import { useGenericCRUD } from '../../hooks/useGenericCRUD';
import { productosService } from '../../services/productos.service';
import { categoriasService } from '../../services/categorias.service';
import { Producto, CreateProductoDTO } from '../../types/producto.types';
import { COLUMNS, DETAIL_FIELDS, ENTITY_CONFIG, buildFields } from './config';
import type { FieldOption } from '../Common/types';

/**
 * ProductosList — Componente principal de gestión de productos.
 */
export function ProductosList() {
  const crud = useGenericCRUD<Producto, CreateProductoDTO>(productosService);

  // Cargar categorías para el select del formulario
  const [catOptions, setCatOptions] = useState<FieldOption[]>([]);

  useEffect(() => {
    categoriasService
      .getAll({ limit: 200 })
      .then(res =>
        setCatOptions(res.data.map(c => ({ value: String(c.id), label: c.nombre })))
      )
      .catch(() => {/* ignorar si falla — el select seguirá sin opciones */});
  }, []);

  // Campos dinámicos con las opciones de categorías cargadas
  const fields = useMemo(() => buildFields(catOptions), [catOptions]);

  // Memoizados para evitar re-renders innecesarios
  const toFormValues = useCallback((producto: Producto): Record<string, unknown> => ({
    nombre:       producto.nombre,
    categoria_id: producto.categoria_id != null ? String(producto.categoria_id) : '',
    imagen:       null, // el usuario sube una nueva imagen si quiere cambiarla
  }), []);

  const createDefaults = useMemo<Record<string, unknown>>(() => ({
    nombre:       '',
    categoria_id: '',
    imagen:       null,
  }), []);

  return (
    <ListPage<Producto, CreateProductoDTO>
      config={ENTITY_CONFIG}
      columns={COLUMNS}
      fields={fields}
      emptyIcon={<Package size={48} />}
      useData={() => crud}
      toFormValues={toFormValues}
      createDefaults={createDefaults}
      detailFields={DETAIL_FIELDS}
      detailTitle={(p) => p.nombre}
    />
  );
}

export default ProductosList;
