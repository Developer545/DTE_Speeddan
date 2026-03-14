# 🚀 Quick Start - Sistema de Autenticación

## Instalación rápida (2 minutos)

### 1. Instalar dependencias

```bash
npm install react-hook-form zod @hookform/resolvers react-icons framer-motion
```

### 2. Copiar a tu proyecto

Copia toda la carpeta `src/` con estos archivos:

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
├── schemas/
│   └── authSchemas.js
└── index-auth.js
```

### 3. Uso básico (Copy & Paste)

```jsx
// App.jsx
import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import SignUp from './components/SignUp';

function App() {
  const [view, setView] = useState('login'); // 'login' o 'signup'

  return (
    <AuthProvider>
      {view === 'login' ? (
        <Login
          theme="sunset"
          onLogin={async (credentials) => {
            console.log('Login:', credentials);
            // Aquí tu lógica de autenticación
          }}
          onRegister={() => setView('signup')}
          socialProviders={['google', 'facebook']}
        />
      ) : (
        <SignUp
          theme="ocean"
          onRegister={async (data) => {
            console.log('Register:', data);
            // Aquí tu lógica de registro
          }}
          onLogin={() => setView('login')}
        />
      )}
    </AuthProvider>
  );
}

export default App;
```

## ✅ ¡Listo!

Ejecuta tu proyecto:

```bash
npm run dev
```

Tu login está funcionando en http://localhost:3001

---

## 📖 Quieres más?

- Ver **todos los componentes**: [AUTH_SYSTEM_GUIDE.md](./AUTH_SYSTEM_GUIDE.md)
- **10 temas** disponibles: sunset, ocean, midnight, forest, rose, aurora, volcano, lavender, neon, gold
- **Componentes adicionales**: ForgotPassword, TwoFactorAuth, ProtectedRoute
- **Hooks**: useAuth, useAuthGuard
- **Sistema completo** de roles y permisos

---

## 🎨 Cambiar tema

```jsx
<Login theme="ocean" />      // Azul océano
<Login theme="midnight" />   // Oscuro
<Login theme="neon" />       // Rosa neón
```

## 🔐 Con autenticación social

```jsx
<Login
  socialProviders={['google', 'facebook', 'github', 'twitter']}
  onSocialLogin={(provider) => {
    console.log(`Login con ${provider}`);
    // Tu lógica OAuth
  }}
/>
```

## 🛡️ Proteger rutas

```jsx
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
```

---

**¿Dudas?** Lee la guía completa en [AUTH_SYSTEM_GUIDE.md](./AUTH_SYSTEM_GUIDE.md)
