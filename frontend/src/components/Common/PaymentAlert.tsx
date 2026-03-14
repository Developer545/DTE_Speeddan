/**
 * PaymentAlert.tsx — Banner de alerta de pago para el ERP.
 *
 * Comportamiento según días para vencer:
 *   warning  → suave amarillo (1-3 días antes)
 *   urgent   → naranja prominente (0-3 días después)
 *   critical → rojo con modal al iniciar (4-7 días después)
 *   readonly → rojo fijo, sistema suspendido
 *
 * El banner se muestra encima del contenido principal.
 * En modo 'critical', también muestra un modal al cargar la sesión.
 */

import React, { useEffect, useState } from 'react';
import { useTenantStatus } from '../../context/TenantStatusContext';

export function PaymentAlert() {
  const { alertType, diasParaVencer, fecha_pago, fecha_suspension, estado } = useTenantStatus();
  const [showModal, setShowModal] = useState(false);

  // Mostrar modal en critical una vez por sesión
  useEffect(() => {
    if (alertType === 'critical') {
      const key = `erp_critical_shown_${new Date().toDateString()}`;
      if (!sessionStorage.getItem(key)) {
        setShowModal(true);
        sessionStorage.setItem(key, '1');
      }
    }
  }, [alertType]);

  if (alertType === 'none') return null;

  const CONFIG = {
    warning: {
      bg: '#fef3c7', border: '#f59e0b', color: '#92400e',
      icon: '⚠️',
      text: `Tu suscripción vence en ${diasParaVencer} día${diasParaVencer === 1 ? '' : 's'}. Contacta a soporte para renovar.`,
    },
    urgent: {
      bg: '#ffedd5', border: '#f97316', color: '#7c2d12',
      icon: '🔔',
      text: `Tu suscripción venció hace ${Math.abs(diasParaVencer!)} día${Math.abs(diasParaVencer!) === 1 ? '' : 's'}. ${
        fecha_suspension ? `El sistema se suspenderá el ${new Date(fecha_suspension).toLocaleDateString('es-SV')}.` : 'Renueva pronto.'
      }`,
    },
    critical: {
      bg: '#fee2e2', border: '#ef4444', color: '#991b1b',
      icon: '🚨',
      text: `ATENCIÓN: Tu suscripción está vencida. El sistema se suspenderá pronto. Contacta a soporte AHORA.`,
    },
    readonly: {
      bg: '#1e1b4b', border: '#7c3aed', color: '#c4b5fd',
      icon: '🔒',
      text: estado === 'suspendido'
        ? 'Sistema suspendido por falta de pago. Solo visualización. Contacta a soporte para reactivar.'
        : 'Sistema en modo de solo lectura. Contacta a soporte.',
    },
  } as const;

  const cfg = CONFIG[alertType as keyof typeof CONFIG];

  return (
    <>
      {/* Banner principal */}
      <div style={{
        background: cfg.bg,
        borderBottom: `2px solid ${cfg.border}`,
        color: cfg.color,
        padding: alertType === 'critical' || alertType === 'readonly' ? '12px 20px' : '8px 20px',
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'Inter', sans-serif",
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
        <span style={{ flex: 1 }}>{cfg.text}</span>
        {alertType === 'readonly' && (
          <span style={{
            background: cfg.border, color: '#fff',
            borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
          }}>
            SOLO LECTURA
          </span>
        )}
      </div>

      {/* Modal de advertencia crítica */}
      {showModal && (
        <div style={modalStyles.overlay} onClick={() => setShowModal(false)}>
          <div style={modalStyles.box} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.icon}>🚨</div>
            <h2 style={modalStyles.title}>Suscripción vencida</h2>
            <p style={modalStyles.text}>
              Tu plan de suscripción ha vencido. Tienes un período de gracia limitado.
              Si no realizas el pago antes de la fecha de corte, <strong>el sistema
              pasará a modo de solo visualización</strong> y no podrás crear, editar
              ni eliminar datos.
            </p>
            {fecha_suspension && (
              <p style={modalStyles.date}>
                Fecha de corte: {new Date(fecha_suspension).toLocaleDateString('es-SV', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            )}
            <p style={modalStyles.contact}>
              Contacta a soporte para renovar tu suscripción.
            </p>
            <button style={modalStyles.btn} onClick={() => setShowModal(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    fontFamily: "'Inter', sans-serif",
  },
  box: {
    background: '#fff', borderRadius: 16, padding: '40px 36px',
    maxWidth: 440, width: '90%', textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
  },
  icon:    { fontSize: 48, marginBottom: 16 },
  title:   { color: '#991b1b', fontSize: 22, fontWeight: 700, margin: '0 0 16px' },
  text:    { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' },
  date:    { color: '#dc2626', fontWeight: 700, fontSize: 15, margin: '0 0 16px' },
  contact: { color: '#6b7280', fontSize: 13, margin: '0 0 24px' },
  btn:     { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
