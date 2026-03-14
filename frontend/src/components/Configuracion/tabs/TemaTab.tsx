/**
 * TemaTab.tsx — Personalización del tema visual del sistema.
 *
 * Permite cambiar la paleta de colores en vivo.
 * Los cambios se aplican inmediatamente en toda la app via CSS vars
 * y se persisten en la base de datos.
 */

import React, { useEffect, useState } from 'react';
import { Palette, Save, RotateCcw } from 'lucide-react';
import { colors, radius, DEFAULT_THEME, applyTheme } from '../../../styles/colors';
import { useTheme } from '../../../context/ThemeContext';
import { notify } from '../../../utils/notify';

// ── Paletas predefinidas ───────────────────────────────────────────────────────

interface Paleta {
  name:  string;
  glass: boolean;
  preview: string; // color de preview (dot)
  theme: {
    accent:      string;
    accent_text: string;
    page_bg:     string;
    card_bg:     string;
    sidebar_bg:  string;
    glass_blur:  string;
  };
}

const PALETAS: Paleta[] = [
  // ── Temas sólidos ────────────────────────────────────────────────────────────
  {
    name: 'Negro (por defecto)', glass: false, preview: '#111111',
    theme: { accent: '#111111', accent_text: '#ffffff', page_bg: '#f5f5f5', card_bg: '#ffffff', sidebar_bg: '#ffffff', glass_blur: '' },
  },
  {
    name: 'Azul corporativo', glass: false, preview: '#2563eb',
    theme: { accent: '#2563eb', accent_text: '#ffffff', page_bg: '#f0f4ff', card_bg: '#ffffff', sidebar_bg: '#ffffff', glass_blur: '' },
  },
  {
    name: 'Verde esmeralda', glass: false, preview: '#059669',
    theme: { accent: '#059669', accent_text: '#ffffff', page_bg: '#f0fdf4', card_bg: '#ffffff', sidebar_bg: '#ffffff', glass_blur: '' },
  },
  {
    name: 'Morado', glass: false, preview: '#7c3aed',
    theme: { accent: '#7c3aed', accent_text: '#ffffff', page_bg: '#faf5ff', card_bg: '#ffffff', sidebar_bg: '#ffffff', glass_blur: '' },
  },
  {
    name: 'Rojo', glass: false, preview: '#dc2626',
    theme: { accent: '#dc2626', accent_text: '#ffffff', page_bg: '#fff7f7', card_bg: '#ffffff', sidebar_bg: '#ffffff', glass_blur: '' },
  },
  {
    name: 'Oscuro', glass: false, preview: '#f59e0b',
    theme: { accent: '#f59e0b', accent_text: '#111111', page_bg: '#18181b', card_bg: '#27272a', sidebar_bg: '#111111', glass_blur: '' },
  },
  // ── Temas Glass Premium ──────────────────────────────────────────────────────
  {
    name: 'Galaxia Violeta', glass: true, preview: '#a78bfa',
    theme: {
      accent:      '#a78bfa',
      accent_text: '#1e1b4b',
      page_bg:     'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      card_bg:     '#1e1b4b',
      sidebar_bg:  '#130f38',
      glass_blur:  '',
    },
  },
  {
    name: 'Aurora Boreal', glass: true, preview: '#22d3ee',
    theme: {
      accent:      '#22d3ee',
      accent_text: '#042f2e',
      page_bg:     'linear-gradient(135deg, #0a192f 0%, #1a3a4a 40%, #0d3b2e 100%)',
      card_bg:     '#0d2035',
      sidebar_bg:  '#091828',
      glass_blur:  '',
    },
  },
  {
    name: 'Puesta de Sol', glass: true, preview: '#fb923c',
    theme: {
      accent:      '#fb923c',
      accent_text: '#ffffff',
      page_bg:     'linear-gradient(135deg, #1a1a2e 0%, #16213e 45%, #3d1a2e 100%)',
      card_bg:     '#1e1c38',
      sidebar_bg:  '#141428',
      glass_blur:  '',
    },
  },
  {
    name: 'Nieve Ártica', glass: true, preview: '#7c3aed',
    theme: {
      accent:      '#7c3aed',
      accent_text: '#ffffff',
      page_bg:     'linear-gradient(135deg, #c7d2fe 0%, #a5f3fc 50%, #ddd6fe 100%)',
      card_bg:     '#f8f9ff',
      sidebar_bg:  '#eef2ff',
      glass_blur:  '',
    },
  },
  {
    name: 'Esmeralda Profundo', glass: true, preview: '#34d399',
    theme: {
      accent:      '#34d399',
      accent_text: '#022c22',
      page_bg:     'linear-gradient(135deg, #064e3b 0%, #0f2027 50%, #1a3a2e 100%)',
      card_bg:     '#0a2e22',
      sidebar_bg:  '#053d2e',
      glass_blur:  '',
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const labelS: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: colors.textMuted,
  display: 'block', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};

interface ColorFieldProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  hint?:    string;
}

function ColorField({ label, value, onChange, hint }: ColorFieldProps) {
  return (
    <div>
      <label style={labelS}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Swatch clickable que abre el color picker nativo */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: radius.sm,
            background: value, border: `2px solid ${colors.border}`,
            cursor: 'pointer', overflow: 'hidden',
          }}>
            <input
              type="color" value={value}
              onChange={e => onChange(e.target.value)}
              style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
          </div>
        </div>
        <input
          type="text" value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, padding: '7px 10px',
            border: `1px solid ${colors.border}`, borderRadius: radius.sm,
            fontSize: 13, fontFamily: 'monospace', color: colors.textPrimary,
            background: colors.inputBg, outline: 'none',
          }}
          placeholder="#000000"
        />
      </div>
      {hint && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function TemaTab() {
  const { tema, setTheme } = useTheme();

  const [form, setForm] = useState({
    accent:      tema?.accent      ?? DEFAULT_THEME.accent,
    accent_text: tema?.accent_text ?? DEFAULT_THEME.accentText,
    page_bg:     tema?.page_bg     ?? DEFAULT_THEME.pageBg,
    card_bg:     tema?.card_bg     ?? DEFAULT_THEME.cardBg,
    sidebar_bg:  tema?.sidebar_bg  ?? DEFAULT_THEME.sidebarBg,
    glass_blur:  tema?.glass_blur  ?? '',
  });
  const [saving, setSaving] = useState(false);

  // Sincronizar cuando carga el tema del servidor
  useEffect(() => {
    if (tema) {
      setForm({
        accent:      tema.accent,
        accent_text: tema.accent_text,
        page_bg:     tema.page_bg,
        card_bg:     tema.card_bg,
        sidebar_bg:  tema.sidebar_bg,
        glass_blur:  tema.glass_blur ?? '',
      });
    }
  }, [tema]);

  const update = (k: keyof typeof form) => (v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    // Preview en vivo
    applyTheme({
      accent:     next.accent,
      accentText: next.accent_text,
      pageBg:     next.page_bg,
      cardBg:     next.card_bg,
      sidebarBg:  next.sidebar_bg,
      glassBlur:  next.glass_blur,
    });
  };

  const applyPaleta = async (paleta: Paleta) => {
    const t = paleta.theme;
    setForm({ ...t });
    // Preview en vivo inmediato
    applyTheme({
      accent: t.accent, accentText: t.accent_text,
      pageBg: t.page_bg, cardBg: t.card_bg, sidebarBg: t.sidebar_bg,
      glassBlur: t.glass_blur,
    });
    // Guardar en BD
    setSaving(true);
    try {
      await setTheme(t);
      notify.success('Tema guardado');
    } catch (e: any) {
      notify.error('Error al guardar el tema', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setTheme(form);
      notify.success('Tema personalizado guardado');
    } catch (e: any) {
      notify.error('Error al guardar el tema', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    applyPaleta(PALETAS[0]);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Palette size={18} color={colors.textSecondary} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
          Tema visual
        </h2>
      </div>
      <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24, marginTop: 4 }}>
        Las paletas se guardan automáticamente al seleccionarlas. Para colores personalizados, usa el botón "Guardar tema".
      </p>

      {/* Paletas rápidas — grupo Sólidos */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Paletas sólidas
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PALETAS.filter(p => !p.glass).map(p => (
            <button
              key={p.name}
              onClick={() => applyPaleta(p)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 13px',
                background: colors.cardBg, border: `1px solid ${colors.border}`,
                borderRadius: radius.md, fontSize: 12, fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer', color: colors.textPrimary,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: p.preview, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Paletas Premium con degradado */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Paletas premium
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PALETAS.filter(p => p.glass).map(p => (
            <button
              key={p.name}
              onClick={() => applyPaleta(p)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 13px',
                background: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md, fontSize: 12, fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                color: colors.textPrimary,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {/* Mini gradient preview */}
              <div style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: p.theme.page_bg,
                border: `2px solid ${p.preview}`,
                boxShadow: `0 0 0 1px rgba(0,0,0,0.08)`,
              }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Colores personalizados */}
      <div style={{
        background: colors.cardBg, borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 18 }}>
          Personalizar colores
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
          <ColorField label="Color de acento" value={form.accent}      onChange={update('accent')}      hint="Botones, menú activo, badges principales" />
          <ColorField label="Texto sobre acento" value={form.accent_text} onChange={update('accent_text')} hint="Color del texto encima del acento" />
          <ColorField label="Fondo de página" value={form.page_bg}     onChange={update('page_bg')}     hint="Hex o gradiente CSS: linear-gradient(...)" />
          <ColorField label="Fondo de tarjetas" value={form.card_bg}   onChange={update('card_bg')}     hint="Hex o rgba(r,g,b,a) para glass" />
          <ColorField label="Fondo del sidebar" value={form.sidebar_bg} onChange={update('sidebar_bg')} hint="Hex o rgba(r,g,b,a) para glass" />
        </div>
      </div>

      {/* Preview strip */}
      <div style={{
        display: 'flex', gap: 0, height: 28, borderRadius: radius.md,
        overflow: 'hidden', border: `1px solid ${colors.border}`,
        marginBottom: 24,
      }}>
        <div style={{ flex: 1, background: form.page_bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>Página</div>
        <div style={{ flex: 1, background: form.card_bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>Tarjeta</div>
        <div style={{ flex: 1, background: form.sidebar_bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>Sidebar</div>
        <div style={{ flex: 1, background: form.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: form.accent_text }}>Acento</div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave} disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px',
            background: saving ? '#c8c8c8' : form.accent,
            color: form.accent_text, border: 'none',
            borderRadius: radius.md, fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar tema'}
        </button>
        <button
          onClick={handleReset}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', background: 'none',
            border: `1px solid ${colors.border}`, borderRadius: radius.md,
            fontSize: 13, color: colors.textSecondary, cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} /> Restablecer por defecto
        </button>
      </div>
    </div>
  );
}
