/**
 * PlanesPage.tsx — Gestión de planes de suscripción (SaaS Pricing Cards)
 */

import React, { useEffect, useState } from 'react';
import { superAdminSvc, Plan } from '../services/superadmin.service';
import { colors, radius, shadow } from '../../styles/colors';
import { notify } from '../../utils/notify';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Plus, Sparkles, Trash2, Edit2 } from 'lucide-react';

const EMPTY: Omit<Plan, 'id'> = { nombre: '', max_sucursales: 1, max_usuarios: 5, precio: 0, activo: true };

const SEED_PLANS = [
  { nombre: 'Emprendedor', max_sucursales: 1, max_usuarios: 3, precio: 19.99, activo: true },
  { nombre: 'Negocio', max_sucursales: 3, max_usuarios: 10, precio: 49.99, activo: true },
  { nombre: 'Corporativo', max_sucursales: 10, max_usuarios: 50, precio: 99.99, activo: true },
];

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Omit<Plan, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadPlanes();
  }, []);

  const loadPlanes = () => {
    setLoading(true);
    superAdminSvc.getPlanes()
      .then(setPlanes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({ nombre: p.nombre, max_sucursales: p.max_sucursales, max_usuarios: p.max_usuarios, precio: p.precio, activo: p.activo });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await superAdminSvc.updatePlan(editing.id, form);
        setPlanes(prev => prev.map(p => p.id === editing.id ? updated : p));
        notify.success('Plan actualizado correctamente');
      } else {
        const created = await superAdminSvc.createPlan(form);
        setPlanes(prev => [...prev, created]);
        notify.success('Plan creado exitosamente');
      }
      setShowModal(false);
    } catch (e: any) {
      notify.error('Error al guardar', e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este plan? Podría afectar a los clientes actuales.')) return;
    try {
      await superAdminSvc.deletePlan(id);
      setPlanes(prev => prev.filter(p => p.id !== id));
      notify.success('Plan eliminado');
    } catch (e: any) {
      notify.error('Error al eliminar', e.message);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      for (const p of SEED_PLANS) {
        await superAdminSvc.createPlan(p);
      }
      notify.success('Planes de ejemplo generados exitosamente');
      loadPlanes();
    } catch (error: any) {
      notify.error('Error al generar planes', error.message);
    } finally {
      setSeeding(false);
    }
  };

  // Helper to determine if a plan should be highlighted (e.g. the middle one conceptually)
  const isHighlighted = (plan: Plan, index: number) => {
    const isNegocio = plan.nombre.toLowerCase().includes('negocio') || plan.nombre.toLowerCase().includes('pro');
    const isCenter = index === 1 && planes.length === 3;
    return isNegocio || (planes.length === 3 && isCenter);
  };

  return (
    <div style={{ padding: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: colors.textPrimary, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
            Pricing Plans <Sparkles size={24} color={colors.accent} />
          </h2>
          <p style={{ color: colors.textMuted, fontSize: 15, margin: 0 }}>
            Configura los paquetes de suscripción y sus límites.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {planes.length === 0 && !loading && (
            <button onClick={handleSeed} disabled={seeding} style={btnSecondary(colors, radius)}>
              {seeding ? 'Generando...' : 'Generar Planes de Ejemplo'}
            </button>
          )}
          <button onClick={openNew} style={btnPrimary(colors, radius)}>
            <Plus size={18} /> Nuevo Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: colors.textMuted, marginTop: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', border: `3px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', width: 30, height: 30, animation: 'spin 1s linear infinite' }} />
          Cargando planes...
        </div>
      ) : planes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: colors.cardBg, borderRadius: radius.xl, border: `1px dashed ${colors.border}` }}>
          <p style={{ color: colors.textSecondary, marginBottom: 20 }}>No hay planes de suscripción configurados.</p>
          <button onClick={handleSeed} style={btnPrimary(colors, radius)}>Inyectar Planes Default</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: 24, alignItems: 'center' }}>
          {planes.map((p, index) => {
            const highlight = isHighlighted(p, index);

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                style={{
                  background: highlight ? `linear-gradient(145deg, ${colors.cardBg}, #ffffff)` : colors.cardBg,
                  borderRadius: radius.xl,
                  border: highlight ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  boxShadow: highlight ? `0 20px 40px -10px ${colors.accent}40` : shadow.card,
                  padding: '32px 28px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transform: highlight ? 'scale(1.05)' : 'scale(1)',
                  zIndex: highlight ? 10 : 1,
                  opacity: p.activo ? 1 : 0.6
                }}
              >
                {!p.activo && (
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                    INACTIVO
                  </div>
                )}
                {highlight && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: colors.accent, color: colors.accentText, fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, boxShadow: shadow.card }}>
                    MÁS POPULAR
                  </div>
                )}

                <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(p)} style={iconBtn(colors.textSecondary)}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => remove(p.id)} style={iconBtn('#ef4444')}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <h3 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: '0 0 16px' }}>
                  {p.nombre}
                </h3>

                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 24 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: colors.textPrimary, letterSpacing: -1 }}>
                    ${Number(p.precio).toFixed(2)}
                  </span>
                  <span style={{ fontSize: 14, color: colors.textMuted, marginLeft: 4 }}>/ mes</span>
                </div>

                <div style={{ flex: 1 }}>
                  <Feature text={`${p.max_sucursales} Sucursal${p.max_sucursales !== 1 ? 'es' : ''}`} />
                  <Feature text={`Hasta ${p.max_usuarios} Usuario${p.max_usuarios !== 1 ? 's' : ''}`} />
                  <Feature text="Soporte Técnico" />
                  <Feature text="Actualizaciones Incluidas" />
                </div>

                <div style={{ marginTop: 32 }}>
                  <div style={{ width: '100%', textAlign: 'center', padding: '12px', background: highlight ? colors.accent : colors.mutedBg, color: highlight ? colors.accentText : colors.textSecondary, borderRadius: radius.lg, fontWeight: 600, fontSize: 14 }}>
                    Plan Actual
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modern Modal Overlay */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              style={{ position: 'relative', width: '100%', maxWidth: 460, background: colors.cardBg, borderRadius: radius.xl, boxShadow: shadow.modal, overflow: 'hidden' }}
            >
              <div style={{ padding: '24px 28px', borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>
                  {editing ? 'Editar Plan de Suscripción' : 'Crear Nuevo Plan'}
                </h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Field label="Nombre del Plan">
                  <input style={inputStyle(colors, radius)} placeholder="Ej. Pro, Premium..." value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="Máx. Sucursales">
                    <input style={inputStyle(colors, radius)} type="number" min="1" value={form.max_sucursales} onChange={e => setForm(f => ({ ...f, max_sucursales: parseInt(e.target.value) || 1 }))} />
                  </Field>
                  <Field label="Máx. Usuarios">
                    <input style={inputStyle(colors, radius)} type="number" min="1" value={form.max_usuarios} onChange={e => setForm(f => ({ ...f, max_usuarios: parseInt(e.target.value) || 1 }))} />
                  </Field>
                </div>

                <Field label="Precio (USD/mes)">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, fontWeight: 600 }}>$</span>
                    <input style={{ ...inputStyle(colors, radius), paddingLeft: 30 }} type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </Field>

                <Field label="Estado del Plan">
                  <select style={inputStyle(colors, radius)} value={form.activo ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, activo: e.target.value === 'true' }))}>
                    <option value="true">Activo (Visible)</option>
                    <option value="false">Inactivo (Oculto)</option>
                  </select>
                </Field>
              </div>

              <div style={{ padding: '20px 28px', background: colors.mutedBg, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button style={btnSecondary(colors, radius)} onClick={() => setShowModal(false)}>Cancelar</button>
                <button style={btnPrimary(colors, radius)} onClick={save} disabled={saving || !form.nombre.trim()}>
                  {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Plan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// -- Helpers UI --

function Feature({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <CheckCircle2 size={18} color="#10b981" />
      <span style={{ color: colors.textSecondary, fontSize: 14, fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function btnPrimary(c: typeof colors, r: any): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 8, background: c.accent, color: c.accentText, border: 'none', borderRadius: r.md, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 12px ${c.accent}40` };
}

function btnSecondary(c: typeof colors, r: any): React.CSSProperties {
  return { background: c.pageBg, color: c.textSecondary, border: `1px solid ${c.border}`, borderRadius: r.md, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' };
}

function iconBtn(col: string): React.CSSProperties {
  return { background: 'transparent', border: 'none', cursor: 'pointer', color: col, padding: 6, opacity: 0.7, transition: 'opacity 0.2s' };
}

function inputStyle(c: typeof colors, r: any): React.CSSProperties {
  return { background: c.pageBg, border: `1px solid ${c.border}`, borderRadius: r.md, padding: '10px 14px', color: c.textPrimary, fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' };
}
