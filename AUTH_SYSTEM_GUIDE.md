# 🔐 Sistema de Autenticación Reutilizable - Guía Completa

## 📋 Índice

1. [Características](#características)
2. [Instalación](#instalación)
3. [Componentes Disponibles](#componentes-disponibles)
4. [Uso Básico](#uso-básico)
5. [AuthContext y Hooks](#authcontext-y-hooks)
6. [Personalización de Temas](#personalización-de-temas)
7. [Ejemplos de Integración](#ejemplos-de-integración)
8. [API Reference](#api-reference)

---

## ✨ Características

- ✅ **Login** con validación completa
- ✅ **Registro de usuarios** con validación de contraseña fuerte
- ✅ **Recuperación de contraseña** en 2 pasos
- ✅ **Autenticación 2FA** con código de 6 dígitos
- ✅ **Autenticación social** (Google, Facebook, GitHub, Twitter)
- ✅ **10 temas prediseñados** completamente personalizables
- ✅ **Validación con Zod** y React Hook Form
- ✅ **Animaciones fluidas** con Framer Motion
- ✅ **Gestión de estado global** con AuthContext
- ✅ **Protección de rutas** basada en roles y permisos
- ✅ **TypeScript ready** (schemas de validación)
- ✅ **Responsive** y mobile-first
- ✅ **Accesible** (ARIA labels, keyboard navigation)

---

## 📦 Instalación

### 1. Dependencias requeridas

```bash
npm install react-hook-form zod @hookform/resolvers react-icons framer-motion axios
```

### 2. Copiar archivos del sistema

Copia estos directorios a tu proyecto:

```
src/
├── components/
│   ├── Login/
│   ├── SignUp/
│   ├── ForgotPassword/
│   ├── TwoFactorAuth/
│   └── ProtectedRoute/
├── context/
│   └── AuthContext.jsx
├── hooks/
│   └── useAuthGuard.js
└── schemas/
    └── authSchemas.js
```

---

## 🎨 Componentes Disponibles

### 1. Login

Componente de inicio de sesión con múltiples características.

```jsx
import Login from './components/Login';

function App() {
  const handleLogin = async (credentials) => {
    // Lógica de autenticación
    console.log(credentials); // { email, password, rememberMe }
  };

  return (
    <Login
      theme="sunset"
      onLogin={handleLogin}
      onSocialLogin={(provider) => console.log(provider)}
      onRegister={() => navigate('/register')}
      onForgotPassword={() => navigate('/forgot-password')}
      showRememberMe={true}
      socialProviders={['google', 'facebook', 'github', 'twitter']}
      backgroundImage="/path/to/image.jpg"
    />
  );
}
```

**Props del Login:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `theme` | string | 'sunset' | Tema visual (sunset, ocean, midnight, etc.) |
| `onLogin` | function | - | Callback cuando se envía el formulario |
| `onSocialLogin` | function | - | Callback para login social |
| `onRegister` | function | - | Callback al hacer clic en "Regístrate" |
| `onForgotPassword` | function | - | Callback al hacer clic en "Olvidé mi contraseña" |
| `showRememberMe` | boolean | true | Mostrar checkbox "Recuérdame" |
| `socialProviders` | array | ['google'] | Proveedores sociales a mostrar |
| `backgroundImage` | string | null | Imagen de fondo |
| `logo` | ReactNode | null | Logo personalizado |
| `brandName` | string | 'YourApp' | Nombre de la aplicación |

---

### 2. SignUp

Componente de registro con validación completa.

```jsx
import SignUp from './components/SignUp';

function RegisterPage() {
  const handleRegister = async (data) => {
    console.log(data);
    // { name, email, password, confirmPassword, termsAccepted }
  };

  return (
    <SignUp
      theme="ocean"
      onRegister={handleRegister}
      onSocialRegister={(provider) => console.log(provider)}
      onLogin={() => navigate('/login')}
      requireTerms={true}
      socialProviders={['google', 'facebook']}
    />
  );
}
```

**Props del SignUp:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `theme` | string | 'sunset' | Tema visual |
| `onRegister` | function | - | Callback cuando se completa el registro |
| `onSocialRegister` | function | - | Callback para registro social |
| `onLogin` | function | - | Callback al hacer clic en "Inicia sesión" |
| `requireTerms` | boolean | true | Requiere aceptar términos y condiciones |
| `socialProviders` | array | - | Proveedores sociales a mostrar |

---

### 3. ForgotPassword

Componente de recuperación de contraseña en 2 pasos.

```jsx
import ForgotPassword from './components/ForgotPassword';

function ForgotPasswordPage() {
  const handleRequestReset = async (email) => {
    // Enviar código al email
    console.log('Send code to:', email);
  };

  const handleResetPassword = async (data) => {
    // Resetear contraseña con código
    console.log(data); // { email, code, password, confirmPassword }
  };

  return (
    <ForgotPassword
      theme="midnight"
      onRequestReset={handleRequestReset}
      onResetPassword={handleResetPassword}
      onBack={() => navigate('/login')}
    />
  );
}
```

---

### 4. TwoFactorAuth

Componente de verificación 2FA con código de 6 dígitos.

```jsx
import TwoFactorAuth from './components/TwoFactorAuth';

function TwoFactorPage() {
  const handleVerify = async ({ code }) => {
    // Verificar código 2FA
    console.log('Verify code:', code);
  };

  const handleResend = async () => {
    // Reenviar código
    console.log('Resending code...');
  };

  return (
    <TwoFactorAuth
      theme="forest"
      onVerify={handleVerify}
      onResendCode={handleResend}
      email="usuario@ejemplo.com"
      codeLength={6}
    />
  );
}
```

---

## 🔒 AuthContext y Hooks

### Configurar el AuthProvider

Envuelve tu aplicación con el `AuthProvider`:

```jsx
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider
      persistAuth={true}
      storageKey="auth_user"
      onLoginSuccess={(user) => console.log('Logged in:', user)}
      onLogoutSuccess={() => console.log('Logged out')}
    >
      <YourApp />
    </AuthProvider>
  );
}
```

### Usar el hook useAuth

```jsx
import { useAuth } from './context/AuthContext';

function Dashboard() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    hasPermission,
    isAdmin
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>

      {isAdmin() && <AdminPanel />}
      {hasPermission('write') && <EditButton />}

      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Proteger rutas con ProtectedRoute

```jsx
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<SignUp />} />

      {/* Ruta protegida - requiere autenticación */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Ruta protegida - requiere rol admin */}
      <Route path="/admin" element={
        <ProtectedRoute requireRole="admin">
          <AdminPanel />
        </ProtectedRoute>
      } />

      {/* Ruta protegida - requiere permiso específico */}
      <Route path="/editor" element={
        <ProtectedRoute requirePermission="write">
          <Editor />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

### Usar el hook useAuthGuard

```jsx
import { useAuthGuard } from './hooks/useAuthGuard';

function SecureComponent() {
  const { isAuthorized } = useAuthGuard({
    requireAuth: true,
    requireRole: 'admin',
    onUnauthorized: (reason) => {
      console.log('Access denied:', reason);
      // Redirect or show message
    }
  });

  if (!isAuthorized) {
    return <div>Access Denied</div>;
  }

  return <div>Secure Content</div>;
}
```

---

## 🎨 Personalización de Temas

### Temas prediseñados

- `sunset` - Violeta y púrpura (default)
- `ocean` - Azul océano
- `midnight` - Oscuro elegante
- `forest` - Verde bosque
- `rose` - Rosa elegante
- `aurora` - Verde y azul
- `volcano` - Rojo y naranja
- `lavender` - Lavanda suave
- `neon` - Rosa y violeta neón
- `gold` - Dorado elegante

### Crear un tema personalizado

```jsx
import { createCustomTheme } from './components/Login/themes';

const myTheme = createCustomTheme('sunset', {
  accent: '#ff6b6b',
  buttonGradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
});

// Usar en el componente
<Login theme={myTheme} />
```

### Tema completamente personalizado

```jsx
const customTheme = {
  bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  glass: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  accent: '#fbbf24',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.2)',
  buttonGradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  font: "'Poppins', sans-serif",
  error: '#ef4444',
  success: '#10b981'
};
```

---

## 💡 Ejemplos de Integración

### Ejemplo 1: Flujo completo de autenticación

```jsx
import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import TwoFactorAuth from './components/TwoFactorAuth';
import Dashboard from './pages/Dashboard';

function App() {
  const [view, setView] = useState('login'); // login, signup, forgot, 2fa, dashboard
  const [pendingEmail, setPendingEmail] = useState('');

  const handleLogin = async (credentials) => {
    // Simular autenticación
    if (credentials.email === 'admin@example.com') {
      setPendingEmail(credentials.email);
      setView('2fa');
    } else {
      setView('dashboard');
    }
  };

  const handleVerify2FA = async ({ code }) => {
    // Verificar código 2FA
    if (code === '123456') {
      setView('dashboard');
    }
  };

  return (
    <AuthProvider>
      {view === 'login' && (
        <Login
          theme="sunset"
          onLogin={handleLogin}
          onRegister={() => setView('signup')}
          onForgotPassword={() => setView('forgot')}
        />
      )}

      {view === 'signup' && (
        <SignUp
          theme="ocean"
          onRegister={() => setView('login')}
          onLogin={() => setView('login')}
        />
      )}

      {view === 'forgot' && (
        <ForgotPassword
          theme="midnight"
          onBack={() => setView('login')}
        />
      )}

      {view === '2fa' && (
        <TwoFactorAuth
          email={pendingEmail}
          onVerify={handleVerify2FA}
        />
      )}

      {view === 'dashboard' && <Dashboard />}
    </AuthProvider>
  );
}
```

### Ejemplo 2: Integración con React Router

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### Ejemplo 3: Integración con API real

```jsx
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.tudominio.com'
});

function Login() {
  const { login } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      // Llamada a tu API
      const response = await api.post('/auth/login', credentials);

      // Guardar token
      localStorage.setItem('token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      // Actualizar estado global
      await login(credentials, {
        id: response.data.user.id,
        role: response.data.user.role,
        permissions: response.data.user.permissions
      });

      // Redirigir
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Credenciales inválidas');
    }
  };

  return (
    <LoginComponent
      onLogin={handleLogin}
      onSocialLogin={async (provider) => {
        // OAuth flow
        window.location.href = `https://api.tudominio.com/auth/${provider}`;
      }}
    />
  );
}
```

---

## 📚 API Reference

### AuthContext API

```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: Credentials, additionalData?: any) => Promise<Result>;
  logout: () => Promise<Result>;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isAdmin: () => boolean;
}
```

### Schemas de validación (Zod)

```javascript
import { loginSchema, registerSchema, forgotPasswordSchema } from './schemas/authSchemas';

// Todos los schemas están disponibles para usar en otros componentes
```

---

## 🚀 Próximos pasos

1. **Copiar el sistema** a tu proyecto
2. **Instalar dependencias** requeridas
3. **Configurar AuthProvider** en tu App.jsx
4. **Personalizar temas** según tu marca
5. **Integrar con tu API** de backend
6. **Añadir rutas protegidas** según necesites

---

## 📝 Notas importantes

- ⚠️ Los componentes vienen con **validación del lado del cliente** únicamente. Asegúrate de validar también en el servidor.
- ⚠️ Las funciones de OAuth social son **placeholders** - debes implementar el flujo completo con tu proveedor.
- ⚠️ El sistema de roles y permisos es **básico** - puedes extenderlo según tus necesidades.
- ✅ Todos los componentes son **completamente personalizables**
- ✅ El código está **listo para producción** pero requiere integración con tu backend

---

## 🎉 ¡Listo para usar!

Tu sistema de autenticación está completo y listo para integrarse en cualquier proyecto React.

**Servidor de desarrollo corriendo en:** http://localhost:3001

Prueba todos los componentes y personalízalos según tus necesidades.
