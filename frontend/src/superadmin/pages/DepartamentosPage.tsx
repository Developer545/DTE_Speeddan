/**
 * DepartamentosPage.tsx — Gestión del catálogo de departamentos (CAT-012).
 */

import React, { useEffect, useState } from 'react';
import { superAdminSvc, Departamento } from '../services/superadmin.service';
import { colors, radius, shadow } from '../../styles/colors';
import { notify } from '../../utils/notify';

export default function DepartamentosPage() {
  const [items,    setItems]    = useState<Departamento[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Departamento | null>(null);
  const [form,     setForm]     = useState({ codigo: '', nombre: '' });
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    superAdminSvc.getDepartamentos()
      .then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const openNew = () => { setEditing(null); setForm({ codigo: '', nombre: '' }); setShowForm(true); };
  const openEdit = (d: Departamento) => { setEditing(d); setForm({ codigo: d.codigo, nombre: d.nombre }); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await superAdminSvc.updateDepartamento(editing.id, form);
        setItems(prev => prev.map(d => d.id === editing.id ? updated : d));
        notify.success('Departamento actualizado');
      } else {
        const created = await superAdminSvc.createDepartamento(form);
        setItems(prev => [...prev, created]);
        notify.success('Departamento creado');
      }
      setShowForm(false);
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este departamento? También se eliminarán sus municipios.')) return;
    try {
      await superAdminSvc.deleteDepartamento(id);
      setItems(prev => prev.filter(d => d.id !== id));
      notify.success('Departamento eliminado');
    } catch (e: any) { notify.error('Error', e.message); }
  };

  const filtered = items.filter(d =>
    d.nombre.toLowerCase().includes(search.toLowerCase()) ||
    d.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '32px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
            <h2 style={{ fontSize: 21, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Departamentos</h2>
          </div>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 0 14px' }}>
            Catálogo CAT-012 — {items.length} departamentos
          </p>
        </div>
        <button onClick={openNew} style={btnPrimary(colors, radius)}>+ Nuevo departamento</button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div style={{ background: colors.pageBg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '18px 20px', marginBottom: 20 }}>
          <h4 style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, margin: '0 0 14px' }}>
            {editing ? 'Editar departamento' : 'Nuevo departamento'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500 }}>Código *</label>
              <input style={inp(colors, radius)} placeholder="ej: 06" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500 }}>Nombre *</label>
              <input style={inp(colors, radius)} placeholder="ej: San Salvador" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnPrimary(colors, radius)} onClick={save} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
            <button style={btnSec(colors, radius)} onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <input
        style={{ ...inp(colors, radius), marginBottom: 16 }}
        placeholder="Buscar departamento..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Tabla */}
      {loading ? (
        <p style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : (
        <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.border}`, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', padding: '11px 20px', background: colors.mutedBg, color: colors.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, gap: 12 }}>
            <span>Código</span><span>Nombre</span><span></span>
          </div>
          {filtered.length === 0 && <p style={{ color: colors.textMuted, padding: 24, textAlign: 'center' }}>Sin resultados</p>}
          {filtered.map(d => (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', padding: '12px 20px', borderTop: `1px solid ${colors.borderLight}`, alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: colors.accent }}>{d.codigo}</span>
              <span style={{ color: colors.textPrimary }}>{d.nombre}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button style={btnSec(colors, radius)} onClick={() => openEdit(d)}>Editar</button>
                <button style={{ ...btnSec(colors, radius), color: '#ef4444', borderColor: '#ef444444' }} onClick={() => remove(d.id)}>Eliminar</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function inp(c: typeof colors, r: any): React.CSSProperties {
  return { background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: r.md, padding: '9px 12px', color: c.textPrimary, fontSize: 13, width: '100%', boxSizing: 'border-box' };
}
function btnPrimary(c: typeof colors, r: any): React.CSSProperties {
  return { background: c.accent, color: c.accentText, border: 'none', borderRadius: r.md, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
}
function btnSec(c: typeof colors, r: any): React.CSSProperties {
  return { background: 'none', color: c.textSecondary, border: `1px solid ${c.border}`, borderRadius: r.md, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' };
}
