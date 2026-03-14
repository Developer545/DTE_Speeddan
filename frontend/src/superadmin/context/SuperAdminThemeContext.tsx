/**
 * SuperAdminThemeContext.tsx — Tema independiente del panel SuperAdmin.
 *
 * Completamente separado del ThemeContext del ERP.
 * Usa localStorage key 'erp_sa_tema' → no interfiere con los temas de los tenants.
 * No requiere backend — el tema del panel es solo preferencia local del superadmin.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme, ThemeValues, DEFAULT_THEME } from '../../styles/colors';

const SA_STORAGE_KEY = 'erp_sa_tema';

interface SAThemeContextValue {
  theme:    ThemeValues;
  setTheme: (t: Partial<ThemeValues>) => void;
}

const SAThemeContext = createContext<SAThemeContextValue>({
  theme:    DEFAULT_THEME,
  setTheme: () => {},
});

export function SuperAdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeValues>(() => {
    try {
      const saved = localStorage.getItem(SA_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  // Aplica el tema del panel al montar (sobrescribe cualquier tema de tenant activo)
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const setTheme = (partial: Partial<ThemeValues>) => {
    const next = { ...theme, ...partial };
    applyTheme(next);
    setThemeState(next);
    try {
      localStorage.setItem(SA_STORAGE_KEY, JSON.stringify(next));
    } catch { /* silencioso */ }
  };

  return (
    <SAThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </SAThemeContext.Provider>
  );
}

export function useSATheme() {
  return useContext(SAThemeContext);
}
