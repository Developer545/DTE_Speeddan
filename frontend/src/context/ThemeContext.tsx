/**
 * ThemeContext.tsx — Contexto global de tema.
 *
 * Al montar la app:
 *   1. Carga el tema guardado en la base de datos.
 *   2. Aplica los CSS custom properties en :root.
 *   3. Expone `setTheme` para que TemaTab pueda actualizar en vivo.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme, saveThemeToStorage, DEFAULT_THEME } from '../styles/colors';
import { getTema, updateTema, type ConfigTema } from '../services/config.service';

interface ThemeContextValue {
  tema:      ConfigTema | null;
  setTheme:  (partial: Partial<ConfigTema>) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  tema:      null,
  setTheme:  async () => {},
  isLoading: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema,      setTema]      = useState<ConfigTema | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTema()
      .then((t) => {
        setTema(t);
        applyTheme({
          accent:     t.accent,
          accentText: t.accent_text,
          pageBg:     t.page_bg,
          cardBg:     t.card_bg,
          sidebarBg:  t.sidebar_bg,
          glassBlur:  t.glass_blur ?? '',
        });
      })
      .catch(() => {
        // Si falla la carga, usar valores por defecto
        applyTheme(DEFAULT_THEME);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setTheme = async (partial: Partial<ConfigTema>) => {
    // Aplicar en vivo inmediatamente (antes de guardar)
    applyTheme({
      accent:     partial.accent,
      accentText: partial.accent_text,
      pageBg:     partial.page_bg,
      cardBg:     partial.card_bg,
      sidebarBg:  partial.sidebar_bg,
      glassBlur:  partial.glass_blur,
    });

    // Guardar en base de datos
    const actualizado = await updateTema(partial);
    setTema(actualizado);

    // Persistir en localStorage → initThemeDefaults() lo leerá sincrónicamente
    // en el próximo reload antes de cualquier render → cero flash
    saveThemeToStorage({
      accent:     actualizado.accent,
      accentText: actualizado.accent_text,
      pageBg:     actualizado.page_bg,
      cardBg:     actualizado.card_bg,
      sidebarBg:  actualizado.sidebar_bg,
      glassBlur:  actualizado.glass_blur ?? '',
    });
  };

  return (
    <ThemeContext.Provider value={{ tema, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
