/**
 * MunicipiosPage.tsx — Gestión del catálogo de municipios (CAT-013).
 */

import React, { useEffect, useState } from 'react';
import { superAdminSvc, Municipio, Departamento } from '../services/superadmin.service';
import { colors, radius, shadow } from '../../styles/colors';
import { notify } from '../../utils/notify';

export default function MunicipiosPage() {
  const [items,    setItems]       = useState<Municipio[]>([]);
  const [deptos,   setDeptos]      = useState<Departamento[]>([]);
  const [loading,  setLoading]     = useState(true);
  const [showForm, setShowForm]    = useState(false);
  const [editing,  setEditing]     = useState<Municipio | null>(null);
  const [form,     setForm]        = useState({ codigo: '', nombre: '', departamento_id: 0 });
  const [saving,   setSaving]      = useState(false);
  const [search,   setSearch]      = useState('');
  const [filterDep,setFilterDep]   = useState<number | ''>('');

  useEffect(() => {
    Promise.all([
      superAdminSvc.getMunicipios(),
      superAdminSvc.getDepartamentos(),
    ]).then(([m, d]) => { setItems(m); setDeptos(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: '', nombre: '', departamento_id: deptos[0]?.id ?? 0 });
    setShowForm(true);
  };
  const openEdit = (m: Municipio) => {
    setEditing(m);
    setForm({ codigo: m.codigo, nombre: m.nombre, departamento_id: m.departamento_id });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.departamento_id) { notify.error('Selecciona un departamento'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await superAdminSvc.updateMunicipio(editing.id, form);
        setItems(prev => prev.map(m => m.id === editing.id ? updated : m));
        notify.success('Municipio actualizado');
      } else {
        const created = await superAdminSvc.createMunicipio(form);
        setItems(prev => [...prev, created]);
        notify.success('Municipio creado');
      }
      setShowForm(false);
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este municipio?')) return;
    try {
      await superAdminSvc.deleteMunicipio(id);
      setItems(prev => prev.filter(m => m.id !== id));
      notify.success('Municipio eliminado');
    } catch (e: any) { notify.error('Error', e.message); }
  };

  const deptoMap = Object.fromEntries(deptos.map(d => [d.id, d.nombre]));

  const filtered = items.filter(m => {
    const matchSearch = m.nombre.toLowerCase().includes(search.toLowerCase()) || m.codigo.toLowerCase().includes(search.toLowerCase());
    const matchDep = filterDep === '' || m.departamento_id === filterDep;
    return matchSearch && matchDep;
  });

  return (
    <div style={{ padding: '32px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
            <h2 style={{ fontSize: 21, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Municipios</h2>
          </div>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 0 14px' }}>
            Catálogo CAT-013 — {items.length} municipios
          </p>
        </div>
        <button onClick={openNew} style={btnPrimary(colors, radius)}>+ Nuevo municipio</button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div style={{ background: colors.pageBg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '18px 20px', marginBottom: 20 }}>
          <h4 style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, margin: '0 0 14px' }}>
            {editing ? 'Editar municipio' : 'Nuevo municipio'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500 }}>Código *</label>
              <input style={inp(colors, radius)} placeholder="ej: 01" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500 }}>Nombre *</label>
              <input style={inp(colors, radius)} placeholder="ej: San Salvador" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500 }}>Departamento *</label>
              <select style={inp(colors, radius)} value={form.departamento_id} onChange={e => setForm(f => ({ ...f, departamento_id: parseInt(e.target.value) }))}>
                <option value={0}>Seleccionar...</option>
                {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
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

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, marginBottom: 16 }}>
        <input
          style={inp(colors, radius)}
          placeholder="Buscar municipio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={inp(colors, radius)}
          value={filterDep}
          onChange={e => setFilterDep(e.target.value === '' ? '' : parseInt(e.target.value))}
        >
          <option value="">Todos los departamentos</option>
          {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <p style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : (
        <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.border}`, boxShadow: shadow.card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 120px', padding: '11px 20px', background: colors.mutedBg, color: colors.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, gap: 12 }}>
            <span>Código</span><span>Nombre</span><span>Departamento</span><span></span>
          </div>
          {filtered.length === 0 && <p style={{ color: colors.textMuted, padding: 24, textAlign: 'center' }}>Sin resultados</p>}
          {filtered.map(m => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 120px', padding: '12px 20px', borderTop: `1px solid ${colors.borderLight}`, alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: colors.accent }}>{m.codigo}</span>
              <span style={{ color: colors.textPrimary }}>{m.nombre}</span>
              <span style={{ color: colors.textSecondary }}>{deptoMap[m.departamento_id] ?? '—'}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button style={btnSec(colors, radius)} onClick={() => openEdit(m)}>Editar</button>
                <button style={{ ...btnSec(colors, radius), color: '#ef4444', borderColor: '#ef444444' }} onClick={() => remove(m.id)}>Eliminar</button>
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
