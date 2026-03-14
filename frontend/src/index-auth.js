/**
 * React Authentication System
 * Complete authentication solution with Login, SignUp, Password Recovery, 2FA, and more
 *
 * @version 1.0.0
 * @author Your Company
 */

// Components
export { default as Login, LoginImproved } from './components/Login';
export { default as SignUp } from './components/SignUp';
export { default as ForgotPassword } from './components/ForgotPassword';
export { default as TwoFactorAuth } from './components/TwoFactorAuth';
export { default as ProtectedRoute } from './components/ProtectedRoute';

// Context & Hooks
export { AuthProvider, useAuth } from './context/AuthContext';
export { useAuthGuard } from './hooks/useAuthGuard';

// Themes
export {
  themes,
  getTheme,
  getThemeList,
  createCustomTheme
} from './components/Login/themes';

// Validation Schemas
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  twoFactorSchema
} from './schemas/authSchemas';

/**
 * Quick Start Example:
 *
 * ```jsx
 * import { AuthProvider, Login, useAuth } from './index-auth';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Login
 *         theme="sunset"
 *         onLogin={async (credentials) => {
 *           // Your login logic
 *         }}
 *       />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
