import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute - Componente para proteger rutas basado en autenticación y roles
 */
export const ProtectedRoute = ({
  children,
  requireRole = null,
  requirePermission = null,
  fallback = null,
  unauthorizedComponent = null
}) => {
  const { isAuthenticated, hasRole, hasPermission, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return unauthorizedComponent || (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#1f2937', marginBottom: '16px' }}>Acceso no autorizado</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Debes iniciar sesión para acceder a esta página
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  // Check role
  if (requireRole && !hasRole(requireRole)) {
    return unauthorizedComponent || (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#1f2937', marginBottom: '16px' }}>Acceso denegado</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            No tienes el rol requerido para acceder a esta página
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Check permission
  if (requirePermission && !hasPermission(requirePermission)) {
    return unauthorizedComponent || (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#1f2937', marginBottom: '16px' }}>Permiso denegado</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            No tienes los permisos necesarios para acceder a esta página
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // User is authorized, render children
  return <>{children}</>;
};

export default ProtectedRoute;
