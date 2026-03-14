/**
 * DepartamentosTab.tsx — CRUD para CAT-012 Departamentos.
 */

import React, { useEffect, useState } from 'react';
import { Map, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { colors, radius } from '../../../styles/colors';
import {
  getDepartamentos, createDepartamento, updateDepartamento, deleteDepartamento,
  type Departamento,
} from '../../../services/catalog.service';
import { notify } from '../../../utils/notify';

// ── Estilos compartidos ───────────────────────────────────────────────────────

const inputS: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: `1px solid ${colors.border}`, borderRadius: radius.sm,
  fontSize: 13, color: colors.textPrimary, background: colors.inputBg,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const labelS: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: colors.textMuted,
  display: 'block', marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};
const thS: React.CSSProperties = {
  padding: '9px 14px', fontSize: 11, fontWeight: 600,
  color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px',
  background: '#fafafa', borderBottom: `1px solid ${colors.border}`, textAlign: 'left',
};
const tdS: React.CSSProperties = {
  padding: '11px 14px', fontSize: 13,
  color: colors.textPrimary, borderBottom: `1px solid ${colors.borderLight}`,
  verticalAlign: 'middle',
};

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  item?:    Departamento;
  onClose:  () => void;
  onSaved:  () => void;
}

function DepartamentoModal({ item, onClose, onSaved }: ModalProps) {
  const isEdit = !!item;
  const [codigo, setCodigo] = useState(item?.codigo ?? '');
  const [nombre, setNombre] = useState(item?.nombre ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!codigo.trim() || !nombre.trim()) { notify.error('Código y nombre son requeridos'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateDepartamento(item!.id, { codigo, nombre });
        notify.success('Departamento actualizado');
      } else {
        await createDepartamento({ codigo, nombre });
        notify.success('Departamento creado');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      notify.error('Error al guardar', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: colors.cardBg, borderRadius: radius.xl, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Map size={16} color={colors.textSecondary} />
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>
              {isEdit ? 'Editar departamento' : 'Nuevo departamento'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelS}>Código</label>
            <input style={inputS} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej. 01" maxLength={10} />
          </div>
          <div>
            <label style={labelS}>Nombre</label>
            <input style={inputS} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Ahuachapán" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: 13, cursor: 'pointer', color: colors.textSecondary }}>
            Cancelar
          </button>
          <button
            onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: saving ? '#c8c8c8' : colors.accent, color: colors.accentText, border: 'none', borderRadius: radius.md, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function DepartamentosTab() {
  const [items,       setItems]       = useState<Departamento[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<{ open: boolean; item?: Departamento }>({ open: false });
  const [confirmarId, setConfirmarId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getDepartamentos()
      .then(setItems)
      .catch(() => notify.error('No se pudieron cargar los departamentos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteDepartamento(id);
      load();
      notify.success('Departamento eliminado');
    } catch (e: any) {
      notify.error('Error al eliminar', e.response?.data?.message);
    } finally { setConfirmarId(null); }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Map size={18} color={colors.textSecondary} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>Departamentos</h2>
          <span style={{ fontSize: 12, color: colors.textMuted, background: colors.mutedBg, padding: '2px 8px', borderRadius: 9999 }}>
            CAT-012
          </span>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: colors.accent, color: colors.accentText, border: 'none', borderRadius: radius.md, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> Nuevo departamento
        </button>
      </div>

      {/* Tabla */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Código', 'Nombre', 'Acciones'].map(h => (
                <th key={h} style={{ ...thS, textAlign: h === 'Acciones' ? 'center' : 'left', width: h === 'Acciones' ? 100 : undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={3} style={{ ...tdS, textAlign: 'center', padding: '40px 0', color: colors.textMuted }}>
                  No hay departamentos. Crea el primero.
                </td>
              </tr>
            )}
            {items.map(dep => (
              <tr key={dep.id}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{ position: 'relative' }}
              >
                <td style={{ ...tdS, width: 100 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>{dep.codigo}</span>
                </td>
                <td style={tdS}>{dep.nombre}</td>
                <td style={{ ...tdS, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      title="Editar" onClick={() => setModal({ open: true, item: dep })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', padding: 4 }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      title="Eliminar" onClick={() => setConfirmarId(dep.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {confirmarId === dep.id && (
                    <div style={{ position: 'absolute', zIndex: 10, background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, right: 40, whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 12, marginBottom: 8, color: colors.textPrimary }}>¿Eliminar <b>{dep.nombre}</b>?</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleDelete(dep.id)} style={{ padding: '5px 12px', background: colors.danger, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: 12, cursor: 'pointer' }}>Eliminar</button>
                        <button onClick={() => setConfirmarId(null)} style={{ padding: '5px 10px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <DepartamentoModal
          item={modal.item}
          onClose={() => setModal({ open: false })}
          onSaved={load}
        />
      )}
    </div>
  );
}
