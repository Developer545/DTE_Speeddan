/**
 * UsuariosTab.tsx — Gestión de usuarios del sistema.
 *
 * Roles: admin (acceso total) | user (acceso limitado)
 * Operaciones: crear, editar (nombre, username, rol, activo), cambiar contraseña, eliminar.
 */

import React, { useEffect, useState } from 'react';
import { Users, Plus, Edit2, Trash2, ShieldCheck, ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';
import { colors, radius } from '../../../styles/colors';
import {
  getUsuarios, createUsuario, updateUsuario, deleteUsuario,
  getLimiteUsuarios, type Usuario,
} from '../../../services/config.service';
import { useAuth } from '../../../context/AuthContext';
import { notify } from '../../../utils/notify';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Modal de usuario (crear / editar) ─────────────────────────────────────────

interface ModalProps {
  usuario?:  Usuario;
  isAdmin:   boolean;
  onClose:   () => void;
  onSaved:   () => void;
}

function UsuarioModal({ usuario, isAdmin, onClose, onSaved }: ModalProps) {
  const isEdit = !!usuario;
  const [nombre,   setNombre]   = useState(usuario?.nombre   ?? '');
  const [username, setUsername] = useState(usuario?.username ?? '');
  const [password, setPassword] = useState('');
  const [rol,      setRol]      = useState<'admin' | 'user'>(usuario?.rol ?? 'user');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!nombre.trim() || !username.trim()) { notify.error('Nombre y username son requeridos'); return; }
    if (!isEdit && !password && isAdmin) { notify.error('La contraseña es requerida'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const dto: any = { nombre, username, rol };
        if (password && isAdmin) dto.password = password;
        await updateUsuario(usuario!.id, dto);
        notify.success('Usuario actualizado');
      } else {
        await createUsuario({ nombre, username, password, rol });
        notify.success('Usuario creado');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      notify.error('Error al guardar', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: colors.cardBg, borderRadius: radius.xl,
        width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color={colors.textSecondary} />
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>
              {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelS}>Nombre completo</label>
            <input style={inputS} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. María García" />
          </div>
          <div>
            <label style={labelS}>Username</label>
            <input style={inputS} value={username} onChange={e => setUsername(e.target.value)} placeholder="mariagarcia" />
          </div>
          {isAdmin && (
            <div>
              <label style={labelS}>{isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
              <input style={inputS} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          )}
          <div>
            <label style={labelS}>Rol</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['admin', 'user'] as const).map(r => (
                <div
                  key={r} onClick={() => setRol(r)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: radius.sm,
                    border: `2px solid ${rol === r ? colors.accent : colors.border}`,
                    background: rol === r ? 'rgba(17,17,17,0.04)' : '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {r === 'admin' ? <ShieldCheck size={15} color={rol === r ? colors.accent : colors.textMuted} /> : <ShieldAlert size={15} color={rol === r ? colors.accent : colors.textMuted} />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: rol === r ? colors.textPrimary : colors.textSecondary }}>
                      {r === 'admin' ? 'Admin' : 'Usuario'}
                    </div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>
                      {r === 'admin' ? 'Acceso total' : 'Acceso limitado'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

export function UsuariosTab() {
  const { user: authUser }             = useAuth();
  const isAdmin                        = authUser?.rol === 'admin';
  const [usuarios,    setUsuarios]    = useState<Usuario[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<{ open: boolean; usuario?: Usuario }>({ open: false });
  const [confirmarId, setConfirmarId] = useState<number | null>(null);
  const [toggling,    setToggling]    = useState<number | null>(null);
  const [limiteMax,   setLimiteMax]   = useState<number | null>(null);

  const load = () => {
    getUsuarios()
      .then(setUsuarios)
      .catch(() => notify.error('No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getLimiteUsuarios().then(r => setLimiteMax(r.max)).catch(() => {/* sin límite */});
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteUsuario(id);
      load();
      notify.success('Usuario eliminado');
    } catch (e: any) {
      notify.error('Error al eliminar', e.response?.data?.message);
    } finally { setConfirmarId(null); }
  };

  const handleToggleActivo = async (u: Usuario) => {
    setToggling(u.id);
    try {
      await updateUsuario(u.id, { activo: !u.activo });
      load();
    } catch { /* silencioso */ }
    finally { setToggling(null); }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>
  );

  const limiteAlcanzado = limiteMax !== null && usuarios.length >= limiteMax;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: limiteMax !== null ? 8 : 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={18} color={colors.textSecondary} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>Usuarios del sistema</h2>
        </div>
        {!limiteAlcanzado && (
          <button
            onClick={() => setModal({ open: true })}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: colors.accent, color: colors.accentText, border: 'none', borderRadius: radius.md, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={14} /> Nuevo usuario
          </button>
        )}
      </div>

      {/* Contador de límite */}
      {limiteMax !== null && (
        <p style={{
          fontSize: 12, margin: '0 0 16px',
          color: limiteAlcanzado ? '#b45309' : colors.textMuted,
          fontWeight: limiteAlcanzado ? 600 : 400,
        }}>
          {usuarios.length} / {limiteMax} usuarios permitidos
        </p>
      )}

      {/* Banner límite alcanzado */}
      {limiteAlcanzado && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 18px', marginBottom: 20,
          background: '#fffbeb', border: '1px solid #fbbf24',
          borderRadius: radius.lg,
        }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
              Límite de usuarios alcanzado
            </div>
            <div style={{ fontSize: 13, color: '#78350f' }}>
              Tu plan permite hasta <strong>{limiteMax}</strong> usuario{limiteMax !== 1 ? 's' : ''}.
              Para agregar más usuarios, comunícate con soporte para ampliar tu plan.
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Nombre', 'Username', 'Rol', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ ...thS, textAlign: h === 'Acciones' ? 'center' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdS, textAlign: 'center', padding: '40px 0', color: colors.textMuted }}>
                  No hay usuarios. Crea el primero.
                </td>
              </tr>
            )}
            {usuarios.map(u => (
              <tr key={u.id}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={tdS}>
                  <div style={{ fontWeight: 600 }}>{u.nombre}</div>
                </td>
                <td style={tdS}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.username}</span>
                </td>
                <td style={tdS}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 9999,
                    background: u.rol === 'admin' ? 'rgba(17,17,17,0.08)' : colors.badgeNaturalBg,
                    color:      u.rol === 'admin' ? colors.textPrimary      : colors.badgeNaturalText,
                  }}>
                    {u.rol === 'admin' ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
                    {u.rol}
                  </span>
                </td>
                <td style={tdS}>
                  <button
                    onClick={() => handleToggleActivo(u)}
                    disabled={toggling === u.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 9999,
                      background: u.activo ? colors.successBg : colors.dangerBg,
                      color:      u.activo ? colors.success    : colors.dangerText,
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td style={{ ...tdS, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      title="Editar" onClick={() => setModal({ open: true, usuario: u })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', padding: 4 }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      title="Eliminar" onClick={() => setConfirmarId(u.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {confirmarId === u.id && (
                    <div style={{ position: 'absolute', zIndex: 10, background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, right: 40, whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 12, marginBottom: 8, color: colors.textPrimary }}>¿Eliminar <b>{u.nombre}</b>?</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleDelete(u.id)} style={{ padding: '5px 12px', background: colors.danger, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: 12, cursor: 'pointer' }}>Eliminar</button>
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
        <UsuarioModal
          usuario={modal.usuario}
          isAdmin={isAdmin}
          onClose={() => setModal({ open: false })}
          onSaved={load}
        />
      )}
    </div>
  );
}
