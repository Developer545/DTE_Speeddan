/**
 * TenantStatusContext.tsx — Contexto que maneja el estado del tenant.
 *
 * Detecta si el tenant está:
 *   - En modo pruebas
 *   - Próximo a vencer (alerta 3 días antes)
 *   - En período de gracia (7 días después de vencer)
 *   - Suspendido (modo solo lectura)
 *
 * isReadOnly: true → no puede crear, editar ni borrar nada.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

export type TenantEstado = 'pruebas' | 'activo' | 'suspendido';

export interface TenantStatus {
  estado:          TenantEstado;
  fecha_pago:      string | null;
  fecha_suspension: string | null;
  /** Días hasta el vencimiento del pago. Negativo = ya venció. null = sin fecha. */
  diasParaVencer:  number | null;
  /** true cuando solo lectura (suspendido) */
  isReadOnly:      boolean;
  /** Tipo de alerta que debe mostrarse */
  alertType:       'none' | 'warning' | 'urgent' | 'critical' | 'readonly';
}

interface TenantStatusContextValue extends TenantStatus {
  loading: boolean;
}

const TenantStatusContext = createContext<TenantStatusContextValue | null>(null);

function calcStatus(tenant: {
  estado: TenantEstado;
  fecha_pago: string | null;
  fecha_suspension: string | null;
}): TenantStatus {
  const { estado, fecha_pago, fecha_suspension } = tenant;

  // Tenant suspendido → solo lectura inmediata
  if (estado === 'suspendido') {
    return {
      estado, fecha_pago, fecha_suspension,
      diasParaVencer: null,
      isReadOnly: true,
      alertType: 'readonly',
    };
  }

  // Sin fecha de pago → sin alertas
  if (!fecha_pago) {
    return {
      estado, fecha_pago, fecha_suspension,
      diasParaVencer: null,
      isReadOnly: false,
      alertType: estado === 'pruebas' ? 'none' : 'none',
    };
  }

  const hoy         = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fecha_pago);
  vencimiento.setHours(0, 0, 0, 0);
  const dias = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  // Aún no vence
  if (dias > 3) {
    return { estado, fecha_pago, fecha_suspension, diasParaVencer: dias, isReadOnly: false, alertType: 'none' };
  }

  // Entre 1 y 3 días para vencer → alerta suave
  if (dias >= 0) {
    return { estado, fecha_pago, fecha_suspension, diasParaVencer: dias, isReadOnly: false, alertType: 'warning' };
  }

  // Venció hace hasta 3 días → alerta naranja
  if (dias >= -3) {
    return { estado, fecha_pago, fecha_suspension, diasParaVencer: dias, isReadOnly: false, alertType: 'urgent' };
  }

  // Venció hace 4-7 días → alerta roja
  if (dias >= -7) {
    return { estado, fecha_pago, fecha_suspension, diasParaVencer: dias, isReadOnly: false, alertType: 'critical' };
  }

  // Venció hace más de 7 días → solo lectura (espera que el backend cambie estado, pero el frontend ya bloquea)
  return { estado, fecha_pago, fecha_suspension, diasParaVencer: dias, isReadOnly: true, alertType: 'readonly' };
}

export function TenantStatusProvider({ children }: { children: ReactNode }) {
  const { user }  = useAuth();
  const [status,  setStatus]  = useState<TenantStatus>({
    estado: 'activo', fecha_pago: null, fecha_suspension: null,
    diasParaVencer: null, isReadOnly: false, alertType: 'none',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // El endpoint /api/auth/me ya contiene tenantId.
    // Pedimos la info del tenant a través del slug que viene en el JWT.
    // Usamos el endpoint de tenant status propio del tenant autenticado.
    api.get('/tenant/status')
      .then(res => setStatus(calcStatus(res.data)))
      .catch(() => {
        // Si el endpoint no existe aún, usar estado del JWT (sin fecha)
        setStatus(calcStatus({ estado: 'activo', fecha_pago: null, fecha_suspension: null }));
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <TenantStatusContext.Provider value={{ ...status, loading }}>
      {children}
    </TenantStatusContext.Provider>
  );
}

export function useTenantStatus(): TenantStatusContextValue {
  const ctx = useContext(TenantStatusContext);
  if (!ctx) throw new Error('useTenantStatus debe usarse dentro de <TenantStatusProvider>');
  return ctx;
}
