/**
 * DTETab.tsx — Gestión de correlativos DTE.
 *
 * Permite editar por tipo de DTE (DTE_01 / DTE_03):
 *   - Prefijo establecimiento (ej. M001P001)
 *   - Número correlativo actual (permite reiniciar a 0 cada año)
 */

import React, { useEffect, useState } from 'react';
import { FileText, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { colors, radius } from '../../../styles/colors';
import { getDTEConfigs, updateDTE, type DTEConfig } from '../../../services/config.service';
import { notify } from '../../../utils/notify';

const inputS: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: `1px solid ${colors.border}`, borderRadius: radius.sm,
  fontSize: 13, color: colors.textPrimary, background: colors.inputBg,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
};
const labelS: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: colors.textMuted,
  display: 'block', marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};

// ─────────────────────────────────────────────────────────────────────────────

function DTECard({ config, onSaved }: { config: DTEConfig; onSaved: () => void }) {
  const [prefijo,  setPrefijo]  = useState(config.prefijo);
  const [numActual, setNumActual] = useState(String(config.numero_actual));
  const [saving,   setSaving]   = useState(false);
  const [showReset, setShowReset] = useState(false);

  const TIPO_MAP: Record<string, { label: string; bg: string; color: string }> = {
    DTE_01: { label: 'Factura (Consumidor Final)',   bg: colors.badgeNaturalBg,  color: colors.badgeNaturalText },
    DTE_03: { label: 'Crédito Fiscal',               bg: colors.badgeEmpresaBg,  color: colors.badgeEmpresaText },
    DTE_05: { label: 'Nota de Crédito Electrónica',  bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    DTE_06: { label: 'Nota de Débito Electrónica',   bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
    DTE_11: { label: 'Factura de Exportación',       bg: 'rgba(99,102,241,0.1)', color: '#4f46e5' },
  };
  const tipoInfo   = TIPO_MAP[config.tipo_dte] ?? TIPO_MAP.DTE_01;
  const tipoLabel  = tipoInfo.label;
  const tipoBadgeBg    = tipoInfo.bg;
  const tipoBadgeColor = tipoInfo.color;
  const tipoStr  = config.tipo_dte.replace('DTE_', '');
  const previewNum = String(parseInt(numActual || '0') + 1).padStart(15, '0');
  const preview    = `DTE-${tipoStr}-${prefijo || '...'}-${previewNum}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDTE(config.tipo_dte, {
        prefijo,
        numero_actual: parseInt(numActual, 10) || 0,
      });
      notify.success('Correlativo guardado');
      onSaved();
    } catch (e: any) {
      notify.error('Error al guardar', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await updateDTE(config.tipo_dte, { numero_actual: 0 });
      setNumActual('0'); setShowReset(false);
      notify.success('Correlativo reiniciado a 0');
      onSaved();
    } catch (e: any) {
      notify.error('Error al reiniciar', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      background: colors.cardBg, borderRadius: radius.lg,
      border: `1px solid ${colors.border}`,
      padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <FileText size={16} color={colors.textSecondary} />
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{tipoLabel}</span>
        <span style={{ background: tipoBadgeBg, color: tipoBadgeColor, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 9999 }}>
          {config.tipo_dte.replace('_', '-')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 16 }}>
        <div>
          <label style={labelS}>Prefijo establecimiento</label>
          <input style={inputS} value={prefijo} onChange={e => setPrefijo(e.target.value)} placeholder="M001P001" />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Asignado por el Ministerio de Hacienda
          </div>
        </div>
        <div>
          <label style={labelS}>Número actual (correlativo)</label>
          <input
            style={inputS} type="number" min="0"
            value={numActual}
            onChange={e => setNumActual(e.target.value)}
          />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            El próximo DTE será el {parseInt(numActual || '0') + 1}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={{
        padding: '10px 14px', background: '#f9f9f9',
        borderRadius: radius.sm, border: `1px solid ${colors.borderLight}`,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Próximo número DTE:
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: colors.textPrimary, marginLeft: 10 }}>
          {preview}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={handleSave} disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 20px',
            background: saving ? '#c8c8c8' : colors.accent,
            color: colors.accentText, border: 'none',
            borderRadius: radius.md, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={14} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>

        <button
          onClick={() => setShowReset(true)} disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px',
            background: 'none', color: colors.danger,
            border: `1px solid ${colors.dangerBorder}`,
            borderRadius: radius.md, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <RotateCcw size={14} /> Reiniciar correlativo
        </button>

      </div>

      {/* Confirmación reinicio */}
      {showReset && (
        <div style={{
          marginTop: 14, padding: '14px 16px',
          background: colors.dangerBg, borderRadius: radius.sm,
          border: `1px solid ${colors.dangerBorder}`,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <AlertTriangle size={16} color={colors.danger} />
          <span style={{ fontSize: 13, color: colors.dangerText, fontWeight: 500, flex: 1 }}>
            ¿Reiniciar correlativo a 0? Se usa al inicio de cada año fiscal.
          </span>
          <button
            onClick={handleReset}
            style={{ padding: '6px 16px', background: colors.danger, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Sí, reiniciar
          </button>
          <button
            onClick={() => setShowReset(false)}
            style={{ padding: '6px 14px', background: 'none', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 13, cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function DTETab() {
  const [configs, setConfigs] = useState<DTEConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getDTEConfigs()
      .then(setConfigs)
      .catch(() => notify.error('No se pudieron cargar los correlativos DTE'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <FileText size={18} color={colors.textSecondary} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
          Correlativos DTE
        </h2>
      </div>
      <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24, marginTop: 4 }}>
        El Ministerio de Hacienda asigna el prefijo y restablece el correlativo cada año fiscal.
      </p>

      {configs.map(c => (
        <DTECard key={c.tipo_dte} config={c} onSaved={load} />
      ))}
    </div>
  );
}
