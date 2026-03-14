/**
 * AuthContext.tsx — Contexto de autenticación del ERP.
 * Provee el usuario actual (en memoria) y funciones de login/logout.
 * Al montar, intenta recuperar la sesión activa con GET /auth/me.
 * El login ahora requiere tenant_slug además de username y password.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AuthUser, getMe, login as svcLogin, logout as svcLogout, getTenantBySlug } from '../services/auth.service';

export type { AuthUser } from '../services/auth.service';

interface AuthContextValue {
  user:    AuthUser | null;
  loading: boolean;
  login:   (username: string, password: string, tenantSlug: string) => Promise<void>;
  logout:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Al montar: intenta recuperar sesión activa via cookie
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string, tenantSlug: string) => {
    const u = await svcLogin(username, password, tenantSlug);
    setUser(u);
    // Registrar usuario y tenant en Sentry para enriquecer los reportes de error
    Sentry.setUser({ id: String(u.id), username: u.username, segment: 'erp-user' });
    Sentry.setTag('tenant_id', String((u as any).tenantId ?? 'unknown'));
  };

  const logout = async () => {
    await svcLogout();
    setUser(null);
    // Limpiar contexto de usuario en Sentry al cerrar sesión
    Sentry.setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

// Re-exportar getTenantBySlug para uso en LoginPage
export { getTenantBySlug };
