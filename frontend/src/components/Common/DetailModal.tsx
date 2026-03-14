/**
 * DetailModal.tsx — Modal de solo lectura para ver todos los campos de un registro.
 * Se abre al presionar el botón "Ver detalle" (ícono ojo) en la tabla.
 */

import React from 'react';
import { X } from 'lucide-react';
import { colors, radius } from '../../styles/colors';
import type { DetailField } from './types';

const STYLES = `
  @keyframes detail-in {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  .detail-close:hover {
    background: #f0f0f4 !important;
    border-color: #c4c4c4 !important;
  }
  .detail-btn-close:hover {
    background: #f4f4f6 !important;
    border-color: #c4c4c4 !important;
  }
`;

interface Props<T> {
  item:    T;
  title:   string;
  fields:  DetailField<T>[];
  onClose: () => void;
}

function DetailModal<T>({ item, title, fields, onClose }: Props<T>) {
  return (
    <>
      <style>{STYLES}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,10,20,0.5)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal */}
        <div style={{
          background: colors.cardBg,
          borderRadius: radius.xl,
          width: '100%', maxWidth: '520px',
          maxHeight: '90vh',
          boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
          animation: 'detail-in 0.2s ease-out',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Barra negra superior */}
          <div style={{ height: '4px', background: colors.accent, flexShrink: 0 }} />

          {/* Encabezado */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 18px',
            borderBottom: `1px solid ${colors.borderLight}`,
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: colors.textPrimary, margin: 0, letterSpacing: '-0.2px' }}>
                {title}
              </h2>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: '3px 0 0' }}>
                Información completa del registro
              </p>
            </div>
            <button
              className="detail-close"
              onClick={onClose}
              style={{
                width: '34px', height: '34px',
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                background: colors.cardBg,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <X size={15} color={colors.textSecondary} />
            </button>
          </div>

          {/* Grid de campos */}
          <div style={{
            padding: '22px 24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            overflowY: 'auto',
          }}>
            {fields.map((field, i) => {
              const value = field.getValue(item);
              return (
                <div
                  key={i}
                  style={{
                    gridColumn: field.fullWidth ? '1 / -1' : 'auto',
                    background: colors.pageBg,
                    borderRadius: radius.md,
                    padding: '12px 14px',
                    border: `1px solid ${colors.borderLight}`,
                  }}
                >
                  <p style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    margin: '0 0 6px',
                  }}>
                    {field.label}
                  </p>
                  <div style={{
                    fontSize: '14px',
                    color: value ? colors.textPrimary : '#d0d0d0',
                    fontWeight: 500,
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                  }}>
                    {value ?? '—'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie */}
          <div style={{
            padding: '14px 24px',
            borderTop: `1px solid ${colors.borderLight}`,
            display: 'flex', justifyContent: 'flex-end',
            flexShrink: 0,
            background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
          }}>
            <button
              className="detail-btn-close"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.md,
                background: colors.cardBg,
                fontSize: '14px', fontWeight: 600,
                color: colors.textSecondary, cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              Cerrar
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default DetailModal;
