import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { colors, radius } from '../../styles/colors';

const DIALOG_STYLES = `
  @keyframes dialog-in {
    from { opacity: 0; transform: translateY(10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .dlg-cancel:hover {
    background: var(--input-bg, #f4f4f6) !important;
    border-color: var(--border, #c4c4c4) !important;
  }
  .dlg-confirm:hover:not(:disabled) {
    box-shadow: 0 6px 18px rgba(239,68,68,0.4) !important;
    opacity: 0.9 !important;
  }
  .dlg-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
`;

interface Props {
  title:     string;
  message?:  string;
  loading:   boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}

const ConfirmDialog: React.FC<Props> = ({
  title,
  message = 'Esta acción no se puede deshacer.',
  loading,
  onConfirm,
  onCancel,
}) => (
  <>
    <style>{DIALOG_STYLES}</style>

    {/* Overlay con blur */}
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,10,20,0.5)',
      backdropFilter: 'blur(3px)',
      WebkitBackdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }}>
      {/* Card */}
      <div style={{
        background: colors.cardBg,
        borderRadius: radius.xl,
        maxWidth: '360px', width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
        animation: 'dialog-in 0.2s ease-out',
        overflow: 'hidden',
      }}>

        {/* Barra roja superior */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
        }} />

        {/* Contenido */}
        <div style={{ padding: '32px 28px 24px', textAlign: 'center' }}>

          {/* Ícono */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            width: '60px', height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: '1px solid #fca5a5',
            marginBottom: '18px',
          }}>
            <AlertTriangle size={26} color="#ef4444" />
          </div>

          {/* Título */}
          <h3 style={{
            fontSize: '17px', fontWeight: 700,
            color: colors.textPrimary,
            margin: '0 0 8px',
            letterSpacing: '-0.2px',
          }}>
            {title}
          </h3>

          {/* Mensaje */}
          <p style={{
            fontSize: '14px',
            color: colors.textMuted,
            margin: '0 0 28px',
            lineHeight: '1.5',
          }}>
            {message}
          </p>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              className="dlg-cancel"
              onClick={onCancel}
              style={{
                padding: '10px 22px',
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.md,
                background: colors.cardBg,
                fontSize: '14px', fontWeight: 600,
                color: colors.textSecondary, cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                flex: 1,
              }}
            >
              Cancelar
            </button>
            <button
              className="dlg-confirm"
              onClick={onConfirm}
              disabled={loading}
              style={{
                padding: '10px 22px',
                border: 'none',
                borderRadius: radius.md,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                fontSize: '14px', fontWeight: 600,
                color: '#ffffff', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                transition: 'opacity 0.15s, box-shadow 0.15s',
                flex: 1,
              }}
            >
              {loading && <span className="dlg-spinner" />}
              {loading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </>
);

export default ConfirmDialog;
