/**
 * OnboardingChecklist.tsx — Checklist de bienvenida para nuevos tenants.
 *
 * Se muestra como banner en el dashboard/MainMenu hasta que todos los
 * pasos estén completados. El usuario puede cerrarlo manualmente.
 *
 * Los pasos se verifican consultando el estado real del tenant (API),
 * no son solo flags locales.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { colors, radius } from '../../styles/colors';

interface CheckStep {
  id:      string;
  label:   string;
  ruta:    string;
  done:    boolean;
}

interface OnboardingStatus {
  empresa_completa:   boolean;
  tiene_productos:    boolean;
  tiene_sucursal:     boolean;
  tiene_clientes:     boolean;
  primera_factura:    boolean;
}

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const [status,   setStatus]   = useState<OnboardingStatus | null>(null);
  const [cerrado,  setCerrado]  = useState(() =>
    localStorage.getItem('onboarding_cerrado') === '1'
  );

  useEffect(() => {
    if (cerrado) return;
    api.get<OnboardingStatus>('/onboarding/status')
      .then(r => setStatus(r.data))
      .catch(() => {}); // silencioso si falla
  }, [cerrado]);

  if (cerrado || !status) return null;

  const steps: CheckStep[] = [
    { id: 'empresa',   label: 'Completa los datos de tu empresa (NIT, dirección)',  ruta: '/configuracion', done: status.empresa_completa  },
    { id: 'sucursal',  label: 'Configura tu sucursal y punto de venta',              ruta: '/configuracion', done: status.tiene_sucursal    },
    { id: 'productos', label: 'Agrega tus primeros productos',                       ruta: '/productos',     done: status.tiene_productos   },
    { id: 'clientes',  label: 'Registra tu primer cliente',                          ruta: '/clientes',      done: status.tiene_clientes    },
    { id: 'factura',   label: 'Emite tu primera factura',                            ruta: '/facturacion',   done: status.primera_factura   },
  ];

  const completados = steps.filter(s => s.done).length;
  const total       = steps.length;

  // Si todo está completo, no mostrar
  if (completados === total) return null;

  const pct = Math.round((completados / total) * 100);

  return (
    <div style={{
      background: colors.cardBg,
      border: `1px solid ${colors.border}`,
      borderLeft: `4px solid ${colors.accent}`,
      borderRadius: radius.lg,
      padding: '16px 20px',
      margin: '16px 16px 0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 13, color: colors.textPrimary }}>
            Configura tu sistema
          </span>
          <span style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8 }}>
            {completados}/{total} pasos completados
          </span>
        </div>
        <button
          onClick={() => { localStorage.setItem('onboarding_cerrado', '1'); setCerrado(true); }}
          style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 16, padding: 0 }}
          title="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Barra de progreso */}
      <div style={{ height: 4, background: colors.borderLight, borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: colors.accent, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>

      {/* Pasos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map(step => (
          <div
            key={step.id}
            onClick={() => !step.done && navigate(step.ruta)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: step.done ? 'default' : 'pointer',
              padding: '4px 6px', borderRadius: radius.sm ?? 6,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!step.done) (e.currentTarget as HTMLDivElement).style.background = colors.mutedBg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step.done ? colors.accent : 'transparent',
              border: `2px solid ${step.done ? colors.accent : colors.border}`,
              fontSize: 10, color: step.done ? colors.accentText : 'transparent',
            }}>
              ✓
            </span>
            <span style={{
              fontSize: 12, color: step.done ? colors.textMuted : colors.textPrimary,
              textDecoration: step.done ? 'line-through' : 'none',
            }}>
              {step.label}
            </span>
            {!step.done && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.accent, fontWeight: 600 }}>
                Ir →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
