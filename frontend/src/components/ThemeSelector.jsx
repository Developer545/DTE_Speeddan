import React from 'react';
import { themes } from './Login/themes';

/**
 * Theme Selector Component - Visual theme picker
 * Displays all available themes in a grid with previews
 */
const ThemeSelector = ({ currentTheme, onThemeChange, isOpen, onClose }) => {
  if (!isOpen) return null;

  const themeInfo = {
    sunset: { name: 'Sunset', emoji: '🌅', desc: 'Púrpura y dorado' },
    ocean: { name: 'Ocean', emoji: '🌊', desc: 'Azul y turquesa' },
    midnight: { name: 'Midnight', emoji: '🌙', desc: 'Oscuro y violeta' },
    forest: { name: 'Forest', emoji: '🌲', desc: 'Verde profundo' },
    rose: { name: 'Rose', emoji: '🌹', desc: 'Rojo carmesí' },
    aurora: { name: 'Aurora', emoji: '🌌', desc: 'Verde y azul' },
    volcano: { name: 'Volcano', emoji: '🌋', desc: 'Rojo y naranja' },
    lavender: { name: 'Lavender', emoji: '💜', desc: 'Púrpura suave' },
    neon: { name: 'Neon', emoji: '⚡', desc: 'Rosa neón' },
    gold: { name: 'Gold', emoji: '👑', desc: 'Dorado elegante' }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      zIndex: 999,
      animation: 'fadeIn 0.3s ease-out',
      backdropFilter: 'blur(4px)'
    },
    container: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '24px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
      animation: 'slideIn 0.3s ease-out',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    closeButton: {
      position: 'absolute',
      top: '16px',
      right: '16px',
      background: 'rgba(255, 255, 255, 0.1)',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      cursor: 'pointer',
      padding: '8px 12px',
      fontSize: '18px',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: {
      color: 'white',
      fontSize: '20px',
      fontWeight: '700',
      marginBottom: '8px',
      textAlign: 'center',
      fontFamily: "'Inter', sans-serif"
    },
    subtitle: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '14px',
      marginBottom: '24px',
      textAlign: 'center',
      fontFamily: "'Inter', sans-serif"
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '10px'
    },
    themeButton: {
      padding: '12px 8px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: 'rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      minWidth: '80px'
    },
    themeButtonActive: {
      background: 'rgba(255, 255, 255, 0.2)',
      transform: 'scale(1.05)',
      boxShadow: '0 4px 12px rgba(255, 255, 255, 0.3)'
    },
    emoji: {
      fontSize: '24px'
    },
    themeName: {
      color: 'white',
      fontSize: '11px',
      fontWeight: '600',
      fontFamily: "'Inter', sans-serif",
      textAlign: 'center'
    },
    themeDesc: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '9px',
      fontFamily: "'Inter', sans-serif",
      textAlign: 'center'
    },
    preview: {
      width: '100%',
      height: '4px',
      borderRadius: '4px',
      marginTop: '4px'
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>

      {/* Overlay */}
      <div style={styles.overlay} onClick={onClose} />

      {/* Modal */}
      <div style={styles.container}>
        {/* Close Button */}
        <button
          style={styles.closeButton}
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>

        <div style={styles.title}>Selecciona un Tema</div>
        <div style={styles.subtitle}>Elige el tema que más te guste</div>

        <div style={styles.grid}>
          {Object.keys(themes).map((themeKey) => {
            const theme = themes[themeKey];
            const info = themeInfo[themeKey];
            const isActive = currentTheme === themeKey;

            return (
              <button
                key={themeKey}
                onClick={() => onThemeChange(themeKey)}
                style={{
                  ...styles.themeButton,
                  ...(isActive ? styles.themeButtonActive : {})
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <div style={styles.emoji}>{info.emoji}</div>
                <div style={styles.themeName}>{info.name}</div>
                <div style={styles.themeDesc}>{info.desc}</div>
                <div style={{...styles.preview, background: theme.buttonGradient}} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default ThemeSelector;
