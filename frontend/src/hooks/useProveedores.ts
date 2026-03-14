/**
 * useProveedores.ts — Hook central para el módulo de Proveedores.
 * Misma estructura que useClientes.ts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { proveedoresService } from '../services/proveedores.service';
import {
  Proveedor, CreateProveedorDTO, UpdateProveedorDTO, PaginatedProveedores,
} from '../types/proveedor.types';

const DEBOUNCE_MS = 350;

interface UseProveedoresReturn {
  proveedores: Proveedor[];
  total:       number;
  totalPages:  number;
  page:        number;
  limit:       number;
  search:      string;
  loading:     boolean;
  error:       string | null;
  setPage:     (page: number) => void;
  setLimit:    (limit: number) => void;
  setSearch:   (search: string) => void;
  create:      (dto: CreateProveedorDTO) => Promise<void>;
  update:      (id: number, dto: UpdateProveedorDTO) => Promise<void>;
  remove:      (id: number) => Promise<void>;
  refetch:     () => void;
}

export function useProveedores(): UseProveedoresReturn {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [page,        setPageState]   = useState(1);
  const [limit,       setLimitState]  = useState(10);
  const [search,      setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPageState(1);
    }, DEBOUNCE_MS);
  }, []);

  const setPage  = useCallback((p: number) => setPageState(p), []);
  const setLimit = useCallback((l: number) => { setLimitState(l); setPageState(1); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: PaginatedProveedores = await proveedoresService.getAll({
        search: debouncedSearch, page, limit,
      });
      setProveedores(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async (dto: CreateProveedorDTO): Promise<void> => {
    await proveedoresService.create(dto);
    await fetchData();
  };

  const update = async (id: number, dto: UpdateProveedorDTO): Promise<void> => {
    await proveedoresService.update(id, dto);
    await fetchData();
  };

  const remove = async (id: number): Promise<void> => {
    await proveedoresService.delete(id);
    await fetchData();
  };

  return {
    proveedores, total, totalPages, page, limit, search,
    loading, error,
    setPage, setLimit, setSearch,
    create, update, remove,
    refetch: fetchData,
  };
}
