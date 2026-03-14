/**
 * auth.service.ts — Llamadas a /api/auth usando la instancia axios compartida.
 * Las cookies httpOnly son manejadas automáticamente por el browser.
 * Ahora incluye tenant_slug en el login y tenantId en AuthUser.
 */

import api from './api';

export interface AuthUser {
  id:       number;
  username: string;
  nombre:   string;
  rol:      'admin' | 'user';
  tenantId: number;
}

export interface TenantPublicInfo {
  id:               number;
  nombre:           string;
  estado:           'pruebas' | 'activo' | 'suspendido';
  fecha_pago?:      string | null;
  fecha_suspension?: string | null;
}

/**
 * Verifica si un slug de empresa existe y devuelve su info pública.
 * Se usa en la pantalla de login para mostrar el nombre de la empresa.
 */
export async function getTenantBySlug(slug: string): Promise<TenantPublicInfo> {
  const { data } = await api.get<TenantPublicInfo>(`/auth/tenant/${slug}`);
  return data;
}

/** Login requiere tenant_slug además de username y password. */
export async function login(username: string, password: string, tenantSlug: string): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/login', { username, password, tenant_slug: tenantSlug });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}
