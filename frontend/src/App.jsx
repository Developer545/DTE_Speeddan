import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sileo';
import * as Sentry         from '@sentry/react';
import { useAuth }         from './context/AuthContext';

/** Pantalla de fallback global que se muestra cuando Sentry captura una excepción no manejada. */
function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5', fontFamily: 'Inter, sans-serif', gap: 12,
    }}>
      <h2 style={{ color: '#333', margin: 0 }}>Ocurrió un error inesperado</h2>
      <p style={{ color: '#777', margin: 0 }}>El equipo ha sido notificado automáticamente.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: 14,
        }}
      >
        Recargar página
      </button>
    </div>
  );
}
import { ThemeProvider }   from './context/ThemeContext';
import { EmpresaProvider } from './context/EmpresaContext';
import { TenantStatusProvider } from './context/TenantStatusContext';
import MainMenu    from './components/MainMenu';
import { LoginPage } from './components/Login';
import ImpersonatePage from './components/Login/ImpersonatePage';
import SuperAdminApp from './superadmin/SuperAdminApp';

function App() {
  const { user, loading } = useAuth();
  const location          = useLocation();

  // ── Panel SuperAdmin: ruta completamente separada ─────────────────────────
  // Tiene su propio provider de autenticación, no comparte nada con el ERP.
  if (location.pathname.startsWith('/superadmin')) {
    return <SuperAdminApp />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--page-bg, #f5f5f5)',
        fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#9b9b9b',
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <>
    <Toaster position="top-right" />
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname.startsWith('/login') ? 'login' : 'app'}>

        <Route path="/login/:slug"       element={<LoginPage />} />
        <Route path="/login"             element={<LoginPage />} />
        <Route path="/auth/impersonate" element={<ImpersonatePage />} />

        <Route path="/*" element={
          user
            ? (
              <ThemeProvider>
                <EmpresaProvider>
                  <TenantStatusProvider>
                    <MainMenu />
                  </TenantStatusProvider>
                </EmpresaProvider>
              </ThemeProvider>
            )
            : <Navigate to="/login" replace />
        } />

      </Routes>
    </AnimatePresence>
    </>
    </Sentry.ErrorBoundary>
  );
}

export default App;
