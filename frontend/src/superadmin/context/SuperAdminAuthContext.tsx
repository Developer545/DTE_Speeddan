/**
 * SuperAdminAuthContext.tsx — Contexto de autenticación del panel SuperAdmin.
 * Completamente independiente del AuthContext del ERP.
 * Al montar, verifica si hay sesión activa via GET /superadmin/auth/me.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { superAdminSvc, SuperAdminUser } from '../services/superadmin.service';

/** Resultado del paso 1 del login cuando el 2FA está activo. */
export interface Login2FAChallenge {
  requires2FA: true;
  tempToken:   string;
}

interface SuperAdminAuthContextValue {
  superAdmin: SuperAdminUser | null;
  loading:    boolean;
  /**
   * Paso 1 del login. Si el servidor tiene 2FA activo, retorna el desafío.
   * Si el login es directo (sin 2FA), retorna null y la sesión queda activa.
   */
  login:    (username: string, password: string) => Promise<Login2FAChallenge | null>;
  /** Paso 2 del login: valida el código TOTP con el tempToken del desafío. */
  login2FA: (tempToken: string, code: string) => Promise<void>;
  logout:   () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | null>(null);

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdminUser | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    superAdminSvc.getMe()
      .then(setSuperAdmin)
      .catch(() => setSuperAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<Login2FAChallenge | null> => {
    const response = await superAdminSvc.login(username, password);

    if ('requires2FA' in response && response.requires2FA) {
      // Requiere paso 2 — devolvemos el desafío al componente de login
      return { requires2FA: true, tempToken: response.tempToken };
    }

    // Login directo sin 2FA: cookie ya establecida por el servidor
    setSuperAdmin(response as SuperAdminUser);
    Sentry.setUser({ id: String((response as SuperAdminUser).id), username: (response as SuperAdminUser).username, segment: 'superadmin' });
    return null;
  };

  const login2FA = async (tempToken: string, code: string): Promise<void> => {
    const sa = await superAdminSvc.login2FA(tempToken, code);
    setSuperAdmin(sa);
    Sentry.setUser({ id: String(sa.id), username: sa.username, segment: 'superadmin' });
  };

  const logout = async () => {
    await superAdminSvc.logout();
    setSuperAdmin(null);
    Sentry.setUser(null);
  };

  return (
    <SuperAdminAuthContext.Provider value={{ superAdmin, loading, login, login2FA, logout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth(): SuperAdminAuthContextValue {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) throw new Error('useSuperAdminAuth debe usarse dentro de <SuperAdminAuthProvider>');
  return ctx;
}
