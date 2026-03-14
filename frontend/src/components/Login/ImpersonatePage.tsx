/**
 * ImpersonatePage.tsx — Canjea un token de impersonación del superadmin.
 *
 * Flujo:
 *   1. Superadmin hace clic en "Entrar como cliente"
 *   2. Backend genera token temporal (15 min)
 *   3. Se abre esta página en nueva pestaña con ?token=...
 *   4. Esta página llama POST /api/auth/impersonate para poner la cookie
 *   5. Redirige al dashboard del ERP
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function ImpersonatePage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Token no encontrado en la URL');
      return;
    }

    api.post('/auth/impersonate', { token })
      .then(() => {
        // Recarga completa para que AuthContext detecte la cookie nueva
        window.location.replace('/');
      })
      .catch((e: any) => {
        setError(e.response?.data?.message ?? 'Token inválido o expirado');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5', fontFamily: "'Inter', sans-serif",
    }}>
      {error ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 12 }}>{error}</p>
          <button
            onClick={() => window.close()}
            style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}
          >
            Cerrar pestaña
          </button>
        </div>
      ) : (
        <p style={{ color: '#9b9b9b', fontSize: 14 }}>Iniciando sesión como cliente...</p>
      )}
    </div>
  );
}
