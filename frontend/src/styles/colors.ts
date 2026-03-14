/**
 * colors.ts — Design tokens del sistema.
 *
 * Los tokens marcados con var(--xxx, fallback) son controlados en runtime
 * por ThemeContext (Configuración → Tema). El resto son fijos.
 *
 * Para cambiar el tema ve a: Configuración → Pestaña Tema.
 */

// ── Valores por defecto que se usan como fallback en CSS vars ─────────────────
export interface ThemeValues {
  accent:     string;
  accentText: string;
  pageBg:     string;
  cardBg:     string;
  sidebarBg:  string;
  glassBlur?: string;  // ej: "blur(20px)" — vacío = modo sólido
}

export const DEFAULT_THEME: ThemeValues = {
  accent:     '#111111',
  accentText: '#ffffff',
  pageBg:     '#f5f5f5',
  cardBg:     '#ffffff',
  sidebarBg:  '#ffffff',
  glassBlur:  '',
};

// ── Detección de modo oscuro y derivación automática de tokens ─────────────────

function _isDarkColor(color: string): boolean {
  if (!color) return false;
  // Gradientes → siempre modo oscuro (glass temas)
  if (color.startsWith('linear-gradient') || color.startsWith('radial-gradient')) return true;
  // rgba: si el color base es oscuro
  const rgbaMatch = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const lum = (0.299 * +rgbaMatch[1] + 0.587 * +rgbaMatch[2] + 0.114 * +rgbaMatch[3]) / 255;
    return lum < 0.45;
  }
  // Hex
  const hex = color.replace('#', '');
  if (hex.length >= 6) {
    const r = parseInt(hex.slice(0,2), 16);
    const g = parseInt(hex.slice(2,4), 16);
    const b = parseInt(hex.slice(4,6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45;
  }
  return false;
}

function _applyTextMode(dark: boolean): void {
  const root = document.documentElement;
  if (dark) {
    root.style.setProperty('--text-primary',   '#e8e8f0');
    root.style.setProperty('--text-secondary',  '#a8afc0');
    root.style.setProperty('--text-muted',      '#6b7280');
    root.style.setProperty('--border',          'rgba(255,255,255,0.10)');
    root.style.setProperty('--border-light',    'rgba(255,255,255,0.06)');
    root.style.setProperty('--row-bg',          'rgba(255,255,255,0.02)');
    root.style.setProperty('--row-bg-alt',      'rgba(255,255,255,0.05)');
    root.style.setProperty('--row-hover',       'rgba(255,255,255,0.09)');
    root.style.setProperty('--th-bg',           'rgba(0,0,0,0.22)');   // oscuro sobre card → cabecera visible
    root.style.setProperty('--input-bg',        'rgba(255,255,255,0.08)');
    root.style.setProperty('--skeleton-from',   'rgba(255,255,255,0.06)');
    root.style.setProperty('--skeleton-to',     'rgba(255,255,255,0.11)');
  } else {
    root.style.setProperty('--text-primary',   '#111111');
    root.style.setProperty('--text-secondary', '#444444');
    root.style.setProperty('--text-muted',     '#9b9b9b');
    root.style.setProperty('--border',         '#e5e5e5');
    root.style.setProperty('--border-light',   '#f0f0f0');
    root.style.setProperty('--row-bg',         '#ffffff');
    root.style.setProperty('--row-bg-alt',     '#fafafc');
    root.style.setProperty('--row-hover',      '#f5f5f5');
    root.style.setProperty('--th-bg',          'linear-gradient(to bottom, #fafbfd, #f4f5f8)');
    root.style.setProperty('--input-bg',       '#f5f5f5');
    root.style.setProperty('--skeleton-from',  '#efefef');
    root.style.setProperty('--skeleton-to',    '#e2e2e2');
  }
}

/** Inyecta o elimina el estilo global para efecto glass (backdrop-filter + body gradient) */
function _syncGlassStyle(blur: string): void {
  const STYLE_ID = 'erp-glass-style';
  const existing = document.getElementById(STYLE_ID);
  if (!blur) {
    existing?.remove();
    document.documentElement.removeAttribute('data-glass');
    return;
  }
  document.documentElement.setAttribute('data-glass', '1');
  if (existing) return; // ya inyectado
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html[data-glass="1"] body {
      background: var(--page-bg) !important;
      min-height: 100vh;
    }
    html[data-glass="1"] .erp-sidebar {
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
    }
    html[data-glass="1"] .erp-glass-card {
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border: 1px solid rgba(255,255,255,0.18) !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.28) !important;
    }
  `;
  document.head.appendChild(style);
}

/** Aplica el tema como CSS custom properties en :root */
export function applyTheme(theme: Partial<ThemeValues>): void {
  const root = document.documentElement;
  if (theme.accent     !== undefined) root.style.setProperty('--accent',      theme.accent);
  if (theme.accentText !== undefined) root.style.setProperty('--accent-text', theme.accentText);
  if (theme.pageBg     !== undefined) root.style.setProperty('--page-bg',     theme.pageBg);
  if (theme.cardBg     !== undefined) root.style.setProperty('--card-bg',     theme.cardBg);
  if (theme.sidebarBg  !== undefined) root.style.setProperty('--sidebar-bg',  theme.sidebarBg);
  if (theme.glassBlur  !== undefined) {
    root.style.setProperty('--glass-blur', theme.glassBlur || 'none');
    _syncGlassStyle(theme.glassBlur);
  }

  // Auto-derivar colores según el fondo de TARJETA (donde se renderiza el contenido)
  // Usar cardBg como señal principal — el pageBg puede ser gradiente pero las cartas
  // son sólidas. Gradientes como cardBg (raramente) también se detectan como oscuros.
  const cardBg = theme.cardBg ?? root.style.getPropertyValue('--card-bg');
  _applyTextMode(_isDarkColor(cardBg));
}

const THEME_STORAGE_KEY = 'erp_tema';

/**
 * Guarda el tema activo en localStorage (incluyendo glassBlur).
 * Llamar después de persistir en BD para que el próximo reload sea instantáneo.
 */
export function saveThemeToStorage(theme: ThemeValues): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch { /* silencioso si localStorage no está disponible */ }
}

/**
 * Inicializa CSS vars antes del primer render (llamar en main.tsx).
 * Lee primero localStorage → cero flash. Fallback: DEFAULT_THEME.
 * También establece los tokens derivados (text-primary, border, etc.)
 */
export function initThemeDefaults(): void {
  // Siempre establecer defaults de texto primero (modo claro base)
  _applyTextMode(false);
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      applyTheme(JSON.parse(saved));
      return;
    }
  } catch { /* silencioso */ }
  applyTheme(DEFAULT_THEME);
}

// ── Tokens de color (las vars usan el fallback si no se ha llamado applyTheme) ─
export const colors = {
  // Fondos (controlados por tema)
  pageBg:   'var(--page-bg,   #f5f5f5)',
  cardBg:   'var(--card-bg,   #ffffff)',
  rowHover: 'var(--row-hover, #fafafa)',
  inputBg:  'var(--input-bg,  #f5f5f5)',
  mutedBg:  'var(--input-bg,  #f0f0f0)',

  // Texto (auto-adaptan al modo oscuro/claro)
  textPrimary:   'var(--text-primary,   #111111)',
  textSecondary: 'var(--text-secondary, #444444)',
  textMuted:     'var(--text-muted,     #9b9b9b)',

  // Bordes (auto-adaptan)
  border:      'var(--border,       #e5e5e5)',
  borderLight: 'var(--border-light, #f0f0f0)',

  // Acento (controlado por tema)
  accent:     'var(--accent,      #111111)',
  accentText: 'var(--accent-text, #ffffff)',

  // Sidebar (controlado por tema)
  sidebarBg: 'var(--sidebar-bg, #ffffff)',

  // Estado: error (fijo)
  danger:       '#ef4444',
  dangerBg:     '#fef2f2',
  dangerBorder: '#fca5a5',
  dangerText:   '#dc2626',

  // Estado: success (fijo)
  success:   '#10b981',
  successBg: 'rgba(16,185,129,0.1)',

  // Badges tipo de cliente (fijo)
  badgeNaturalBg:   'rgba(6,182,212,0.1)',
  badgeNaturalText: '#0891b2',
  badgeEmpresaBg:   'rgba(99,102,241,0.1)',
  badgeEmpresaText: '#4f46e5',
} as const;

export const radius = {
  sm: '8px',
  md: '10px',
  lg: '16px',
  xl: '20px',
} as const;

export const shadow = {
  card:  '0 1px 4px rgba(0,0,0,0.04)',
  modal: '0 24px 64px rgba(0,0,0,0.18)',
  hover: '0 12px 32px rgba(0,0,0,0.08)',
} as const;
