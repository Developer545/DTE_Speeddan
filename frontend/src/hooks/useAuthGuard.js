import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Hook para proteger rutas/componentes basado en autenticación
 */
export const useAuthGuard = ({
  requireAuth = true,
  requireRole = null,
  requirePermission = null,
  redirectTo = '/login',
  onUnauthorized = null
}) => {
  const { isAuthenticated, user, hasRole, hasPermission: checkPermission } = useAuth();

  useEffect(() => {
    // Check if authentication is required
    if (requireAuth && !isAuthenticated) {
      if (onUnauthorized) {
        onUnauthorized('not_authenticated');
      } else {
        console.warn('User not authenticated');
        // In a real app, you would redirect here
        // navigate(redirectTo);
      }
      return;
    }

    // Check if specific role is required
    if (requireRole && !hasRole(requireRole)) {
      if (onUnauthorized) {
        onUnauthorized('insufficient_role');
      } else {
        console.warn('User does not have required role:', requireRole);
      }
      return;
    }

    // Check if specific permission is required
    if (requirePermission && !checkPermission(requirePermission)) {
      if (onUnauthorized) {
        onUnauthorized('insufficient_permission');
      } else {
        console.warn('User does not have required permission:', requirePermission);
      }
      return;
    }
  }, [
    isAuthenticated,
    user,
    requireAuth,
    requireRole,
    requirePermission,
    hasRole,
    checkPermission,
    onUnauthorized,
    redirectTo
  ]);

  const isAuthorized =
    (!requireAuth || isAuthenticated) &&
    (!requireRole || hasRole(requireRole)) &&
    (!requirePermission || checkPermission(requirePermission));

  return {
    isAuthorized,
    isAuthenticated,
    user
  };
};

export default useAuthGuard;
