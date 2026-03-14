// npm install @sentry/react
import * as Sentry from '@sentry/react';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider }      from './context/AuthContext';
import { initThemeDefaults } from './styles/colors';

// ── Sentry: inicializar ANTES del render (inactivo si VITE_SENTRY_DSN no está definido)
Sentry.init({
  dsn:         import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.MODE,
  enabled:     !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText:   false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate:         0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,  // Siempre graba la sesión cuando ocurre un error
});

// Aplicar valores por defecto inmediatamente (evita flash sin tema)
initThemeDefaults();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
