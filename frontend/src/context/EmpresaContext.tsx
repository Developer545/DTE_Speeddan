/**
 * EmpresaContext.tsx — Contexto global con la info de la empresa.
 *
 * Usado en:
 *   - MainMenu (nombre en sidebar/header)
 *   - facturacion.service backend (datos emisor en JSON DTE)
 *
 * El frontend solo lo necesita para mostrar el nombre.
 * El backend lee directamente de la DB al generar la factura.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getEmpresa, type ConfigEmpresa } from '../services/config.service';

interface EmpresaContextValue {
  empresa:   ConfigEmpresa | null;
  reload:    () => Promise<void>;
  isLoading: boolean;
}

const EmpresaContext = createContext<EmpresaContextValue>({
  empresa:   null,
  reload:    async () => {},
  isLoading: true,
});

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [empresa,   setEmpresa]   = useState<ConfigEmpresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      setEmpresa(await getEmpresa());
    } catch { /* silencioso */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <EmpresaContext.Provider value={{ empresa, reload: load, isLoading }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}
