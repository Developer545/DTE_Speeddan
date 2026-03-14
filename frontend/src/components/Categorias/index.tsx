/**
 * Categorias/index.tsx — Página CRUD de Categorías.
 *
 * Thin wrapper que orquesta el flujo usando ListPage y la configuración.
 * Para modificar columnas, campos o textos: editar solo config.tsx.
 * Para cambiar la lógica de datos: editar useGenericCRUD.ts o categoriasService.
 */

import { useCallback, useMemo } from 'react';
import { Tag } from 'lucide-react';
import { ListPage } from '../Common';
import { useGenericCRUD } from '../../hooks/useGenericCRUD';
import { categoriasService } from '../../services/categorias.service';
import { Categoria, CreateCategoriaDTO } from '../../types/categoria.types';
import { COLUMNS, FIELDS, ENTITY_CONFIG, DETAIL_FIELDS } from './config';

/**
 * CategoriasList — Componente principal de gestión de categorías.
 * Delega toda la lógica a ListPage y los hooks genéricos.
 */
export function CategoriasList() {
  const crud = useGenericCRUD<Categoria, CreateCategoriaDTO>(categoriasService);

  // Memoizados para evitar re-renders innecesarios en ListPage
  const toFormValues = useCallback((categoria: Categoria): Record<string, unknown> => ({
    nombre: categoria.nombre,
  }), []);

  const createDefaults = useMemo<Record<string, unknown>>(() => ({
    nombre: '',
  }), []);

  return (
    <ListPage<Categoria, CreateCategoriaDTO>
      config={ENTITY_CONFIG}
      columns={COLUMNS}
      fields={FIELDS}
      emptyIcon={<Tag size={48} />}
      useData={() => crud}
      toFormValues={toFormValues}
      createDefaults={createDefaults}
      detailFields={DETAIL_FIELDS}
      detailTitle={(c) => c.nombre}
    />
  );
}

export default CategoriasList;
