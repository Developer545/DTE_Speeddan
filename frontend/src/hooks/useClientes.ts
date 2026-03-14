/**
 * useClientes.ts — Hook central para el módulo de Clientes.
 * Encapsula: estado, paginación, búsqueda con debounce y operaciones CRUD.
 * Los componentes solo llaman métodos de este hook y renderizan el estado.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { clientesService } from '../services/clientes.service';
import {
  Cliente, CreateClienteDTO, UpdateClienteDTO, PaginatedClientes,
} from '../types/cliente.types';

const DEBOUNCE_MS = 350;

interface UseClientesReturn {
  // Estado
  clientes:   Cliente[];
  total:      number;
  totalPages: number;
  page:       number;
  limit:      number;
  search:     string;
  loading:    boolean;
  error:      string | null;
  // Acciones
  setPage:    (page: number) => void;
  setLimit:   (limit: number) => void;
  setSearch:  (search: string) => void;
  create:     (dto: CreateClienteDTO) => Promise<void>;
  update:     (id: number, dto: UpdateClienteDTO) => Promise<void>;
  remove:     (id: number) => Promise<void>;
  refetch:    () => void;
}

export function useClientes(): UseClientesReturn {
  const [clientes,   setClientes]   = useState<Cliente[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page,       setPageState]  = useState(1);
  const [limit,      setLimitState] = useState(10);
  const [search,     setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce: espera 350ms antes de hacer fetch tras un cambio de búsqueda
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPageState(1); // volver a página 1 al buscar
    }, DEBOUNCE_MS);
  }, []);

  const setPage  = useCallback((p: number)  => setPageState(p), []);
  const setLimit = useCallback((l: number)  => { setLimitState(l); setPageState(1); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: PaginatedClientes = await clientesService.getAll({
        search: debouncedSearch, page, limit,
      });
      setClientes(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async (dto: CreateClienteDTO): Promise<void> => {
    await clientesService.create(dto);
    await fetchData();
  };

  const update = async (id: number, dto: UpdateClienteDTO): Promise<void> => {
    await clientesService.update(id, dto);
    await fetchData();
  };

  const remove = async (id: number): Promise<void> => {
    await clientesService.delete(id);
    await fetchData();
  };

  return {
    clientes, total, totalPages, page, limit, search,
    loading, error,
    setPage, setLimit, setSearch,
    create, update, remove,
    refetch: fetchData,
  };
}
