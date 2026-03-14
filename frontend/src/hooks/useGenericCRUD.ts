/**
 * useGenericCRUD.ts — Hook genérico para cualquier módulo CRUD.
 *
 * Encapsula: estado, paginación, búsqueda con debounce y operaciones CRUD.
 *
 * Uso:
 *   const useClientes = () => useGenericCRUD(clientesService);
 *   const useProveedores = () => useGenericCRUD(proveedoresService);
 *
 * Para un módulo nuevo (Productos, Compras, etc.):
 *   const useProductos = () => useGenericCRUD(productosService);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CRUDService, UseGenericCRUDReturn } from '../components/Common/types';
import { notify } from '../utils/notify';

const DEBOUNCE_MS = 350;

export function useGenericCRUD<T, CreateDTO>(
  service: CRUDService<T, CreateDTO>
): UseGenericCRUDReturn<T, CreateDTO> {

  const [items,          setItems]          = useState<T[]>([]);
  const [total,          setTotal]          = useState(0);
  const [totalPages,     setTotalPages]     = useState(0);
  const [page,           setPageState]      = useState(1);
  const [limit,          setLimitState]     = useState(10);
  const [search,         setSearchState]    = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading,        setLoading]        = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Búsqueda con debounce: espera 350ms antes de hacer fetch
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPageState(1);
    }, DEBOUNCE_MS);
  }, []);

  const setPage  = useCallback((p: number)  => setPageState(p), []);
  const setLimit = useCallback((l: number)  => { setLimitState(l); setPageState(1); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await service.getAll({ search: debouncedSearch, page, limit });
      setItems(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      notify.error('Error al cargar datos', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [service, debouncedSearch, page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async (dto: CreateDTO): Promise<void> => {
    await service.create(dto);
    await fetchData();
  };

  const update = async (id: number, dto: Partial<CreateDTO>): Promise<void> => {
    await service.update(id, dto);
    await fetchData();
  };

  const remove = async (id: number): Promise<void> => {
    await service.delete(id);
    await fetchData();
  };

  return {
    items, total, totalPages, page, limit, search,
    loading, error: null as string | null,
    setPage, setLimit, setSearch,
    create, update, remove,
    refetch: fetchData,
  };
}
