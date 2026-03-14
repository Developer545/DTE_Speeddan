/**
 * AjustesTab.tsx — Formulario de ajustes manuales de inventario (FASE 7A).
 * Tipos: merma, daño, robo, corrección negativa, corrección positiva.
 */

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle } from 'lucide-react';
import { inventarioService } from '../../../services/inventario.service';
import { Inventario, TipoAjuste } from '../../../types/inventario.types';
import { colors, radius, shadow } from '../../../styles/colors';
import { notify } from '../../../utils/notify';

interface TipoInfo { value: TipoAjuste; label: string; esResta: boolean; desc: string }

const TIPOS: TipoInfo[] = [
  { value: 'merma',               label: 'Merma',               esResta: true,  desc: 'Productos vencidos, arruinados o sin valor comercial.' },
  { value: 'dano',                label: 'Daño',                esResta: true,  desc: 'Productos con deterioro físico por accidente o mal manejo.' },
  { value: 'robo',                label: 'Robo / Pérdida',      esResta: true,  desc: 'Diferencias por hurto interno o externo.' },
  { value: 'correccion_negativa', label: 'Corrección negativa', esResta: true,  desc: 'Conteo físico resultó menor al registrado en sistema.' },
  { value: 'correccion_positiva', label: 'Corrección positiva', esResta: false, desc: 'Conteo físico resultó mayor al registrado en sistema.' },
];

export function AjustesTab() {
  const [query,      setQuery]      = useState('');
  const [sugs,       setSugs]       = useState<Inventario[]>([]);
  const [showSug,    setShowSug]    = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);
  const [selected,   setSelected]   = useState<Inventario | null>(null);
  const [tipo,       setTipo]       = useState<TipoAjuste>('merma');
  const [cantidad,   setCantidad]   = useState('');
  const [motivo,     setMotivo]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);

  const tipoInfo = TIPOS.find(t => t.value === tipo)!;

  // Búsqueda con debounce
  useEffect(() => {
    if (query.length < 2) { setSugs([]); setShowSug(false); return; }
    setLoadingSug(true);
    const t = setTimeout(async () => {
      try {
        const res = await inventarioService.getAll({ search: query, limit: 15 });
        setSugs(res.data);
        setShowSug(true);
      } catch {
        setSugs([]);
      } finally {
        setLoadingSug(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const selectItem = (item: Inventario) => {
    setSelected(item);
    setQuery(`${item.producto_nombre}${item.lote ? ` · Lote: ${item.lote}` : ''}`);
    setSugs([]);
    setShowSug(false);
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) {
      notify.error('Cantidad inválida', 'Ingrese una cantidad mayor a cero');
      return;
    }
    setSubmitting(true);
    try {
      await inventarioService.postAjuste({
        inventario_id: selected.id,
        tipo,
        cantidad: cant,
        motivo: motivo.trim() || undefined,
      });
      notify.success('Ajuste registrado', 'El ajuste de inventario fue registrado correctamente');
      setSuccess(true);
      setCantidad('');
      setMotivo('');
      setSelected(null);
      setQuery('');
    } catch (err: any) {
      notify.error('Error al registrar ajuste', err.response?.data?.message ?? err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', border: `1px solid ${colors.border}`,
    borderRadius: radius.sm, fontSize: 13, color: colors.textPrimary,
    background: colors.inputBg, outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5, display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Formulario ── */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 24, boxShadow: shadow.card }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, marginBottom: 20 }}>
            Nuevo ajuste manual
          </div>

          {success && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: radius.sm,
              marginBottom: 16, color: '#059669', fontSize: 13, fontWeight: 600,
            }}>
              <CheckCircle size={16} />
              Ajuste registrado correctamente
            </div>
          )}

          {/* Selector de lote */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Lote de inventario</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); setSuccess(false); }}
                onFocus={() => sugs.length > 0 && setShowSug(true)}
                placeholder="Buscar producto / lote..."
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
              {loadingSug && (
                <RefreshCw size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite', color: colors.textMuted }} />
              )}
              {showSug && sugs.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: colors.cardBg, border: `1px solid ${colors.border}`,
                  borderRadius: radius.md, boxShadow: shadow.modal, marginTop: 4,
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {sugs.map(s => (
                    <button
                      key={s.id}
                      onClick={() => selectItem(s)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '9px 14px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderBottom: `1px solid ${colors.borderLight}`,
                        fontSize: 13, color: colors.textPrimary,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600 }}>{s.producto_nombre}</div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        {s.lote ? `Lote: ${s.lote} · ` : ''}Stock: {Number(s.cantidad)} · ${Number(s.precio_unitario).toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div style={{ marginTop: 6, padding: '7px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: radius.sm, fontSize: 12, color: '#059669' }}>
                Stock disponible: <strong>{Number(selected.cantidad)}</strong> unidades
              </div>
            )}
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tipo de ajuste</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoAjuste)}
              style={inputStyle}
            >
              {TIPOS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div style={{ marginTop: 4, fontSize: 11, color: tipoInfo.esResta ? '#d97706' : '#059669' }}>
              {tipoInfo.esResta ? '▼ Resta stock del lote' : '▲ Suma stock al lote'}
            </div>
          </div>

          {/* Cantidad */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Cantidad</label>
            <input
              type="number" min="0.001" step="0.001"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>

          {/* Motivo */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Motivo / Observación <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descripción del ajuste..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selected || !cantidad || submitting}
            style={{
              width: '100%', padding: '10px', background: colors.accent, color: colors.accentText,
              border: 'none', borderRadius: radius.sm, fontSize: 14, fontWeight: 700,
              cursor: (!selected || !cantidad || submitting) ? 'not-allowed' : 'pointer',
              opacity: (!selected || !cantidad || submitting) ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {submitting ? 'Registrando...' : 'Registrar ajuste'}
          </button>
        </div>

        {/* ── Guía de tipos ── */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 24, boxShadow: shadow.card }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, marginBottom: 16 }}>
            Guía de tipos de ajuste
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TIPOS.map(t => (
              <div
                key={t.value}
                onClick={() => setTipo(t.value)}
                style={{
                  padding: '10px 14px', borderRadius: radius.sm,
                  border: `1px solid ${tipo === t.value ? (t.esResta ? '#fca5a5' : '#6ee7b7') : colors.border}`,
                  borderLeft: `3px solid ${t.esResta ? '#ef4444' : '#10b981'}`,
                  background: tipo === t.value
                    ? (t.esResta ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)')
                    : 'transparent',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: t.esResta ? '#dc2626' : '#059669', marginBottom: 3 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>{t.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: radius.sm, fontSize: 12, color: '#4f46e5' }}>
            Todos los ajustes quedan registrados en el kardex del producto para trazabilidad completa.
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
