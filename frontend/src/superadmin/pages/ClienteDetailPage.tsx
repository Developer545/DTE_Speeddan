/**
 * ClienteDetailPage.tsx — Detalle completo de un tenant.
 * Tabs: Info | Pagos | Usuarios | DTE | Sucursales | API Hacienda | Firma
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  superAdminSvc, TenantDetalle, Plan, TenantEstado,
  CreateTenantDTO, UpdateTenantDTO, PagoDTO,
} from '../services/superadmin.service';
import { FirmaElectronicaSection } from '../../components/Common/FirmaElectronicaSection';
import { APIHaciendaSection }      from '../../components/Common/APIHaciendaSection';
import { SucursalesSection }       from '../../components/Common/SucursalesSection';
import { EmpresaSection }          from '../../components/Common/EmpresaSection';
import { colors, radius, shadow } from '../../styles/colors';
import { notify } from '../../utils/notify';

type Tab = 'info' | 'empresa' | 'tema' | 'pagos' | 'usuarios' | 'dte' | 'sucursales' | 'api' | 'firma';

const TAB_LIST: { id: Tab; label: string }[] = [
  { id: 'info',      label: 'Cuenta'       },
  { id: 'empresa',   label: 'Empresa'      },
  { id: 'tema',      label: 'Tema'         },
  { id: 'pagos',     label: 'Pagos'        },
  { id: 'usuarios',  label: 'Usuarios'     },
  { id: 'dte',       label: 'DTE'          },
  { id: 'sucursales',label: 'Sucursales'   },
  { id: 'api',       label: 'API Hacienda' },
  { id: 'firma',     label: 'Firma Digital'},
];

const ESTADO_OPTIONS: { value: TenantEstado; label: string }[] = [
  { value: 'pruebas',    label: 'Pruebas (API MH en ambiente pruebas)' },
  { value: 'activo',     label: 'Activo (API MH en producción)' },
  { value: 'suspendido', label: 'Suspendido (solo lectura)' },
];

// ── Estilos inline usando CSS vars del ERP ─────────────────────────────────────

const S = {
  root:    { padding: '32px 24px', maxWidth: 1000, margin: '0 auto' } as React.CSSProperties,
  header:  { marginBottom: 24 } as React.CSSProperties,
  backBtn: {
    background: 'none', border: 'none', color: colors.accent,
    cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 8,
  } as React.CSSProperties,
  title: {
    color: colors.textPrimary, fontSize: 22, fontWeight: 700, margin: '0 0 6px',
  } as React.CSSProperties,
  slugBadge: {
    background: colors.mutedBg, color: colors.accent,
    borderRadius: 20, padding: '3px 12px', fontSize: 12, fontFamily: 'monospace',
  } as React.CSSProperties,
  tabs: {
    display: 'flex', gap: 2, marginBottom: 20,
    borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  tab: {
    background: 'none', border: 'none', color: colors.textMuted,
    cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 500,
    borderBottom: '2px solid transparent', marginBottom: -1,
  } as React.CSSProperties,
  tabActive: {
    color: colors.accent, borderBottom: `2px solid ${colors.accent}`,
  } as React.CSSProperties,
  section: {
    background: colors.cardBg, borderRadius: radius.lg,
    border: `1px solid ${colors.border}`, boxShadow: shadow.card,
    padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 20,
  } as React.CSSProperties,
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,
  input: {
    background: colors.pageBg, border: `1px solid ${colors.border}`,
    borderRadius: radius.md, padding: '9px 12px',
    color: colors.textPrimary, fontSize: 13, width: '100%', boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  saveBtn: {
    background: colors.accent, color: colors.accentText,
    border: 'none', borderRadius: radius.md,
    padding: '10px 22px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', alignSelf: 'flex-start',
  } as React.CSSProperties,
  dangerBtn: {
    background: '#dc2626', color: '#fff',
    border: 'none', borderRadius: radius.md,
    padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties,
  secondaryBtn: {
    background: 'none', color: colors.textSecondary,
    border: `1px solid ${colors.border}`, borderRadius: radius.md,
    padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
  } as React.CSSProperties,
  table: {
    width: '100%', borderCollapse: 'collapse' as const, fontSize: 13,
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const, padding: '10px 14px',
    color: colors.textMuted, fontWeight: 500, fontSize: 12,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.mutedBg,
  } as React.CSSProperties,
  td: {
    padding: '11px 14px', color: colors.textPrimary,
    borderBottom: `1px solid ${colors.borderLight}`,
  } as React.CSSProperties,
  pagoList: { display: 'flex', flexDirection: 'column' as const, gap: 8 } as React.CSSProperties,
  pagoRow: {
    display: 'grid', gridTemplateColumns: '80px 100px 120px 1fr 130px',
    gap: 12, padding: '12px 16px',
    background: colors.pageBg,
    borderRadius: radius.md, alignItems: 'center', fontSize: 13,
    border: `1px solid ${colors.borderLight}`,
  } as React.CSSProperties,
  inlineForm: {
    background: colors.pageBg, border: `1px solid ${colors.border}`,
    borderRadius: radius.md, padding: '16px 20px',
    display: 'flex', flexDirection: 'column' as const, gap: 14,
  } as React.CSSProperties,
};

// ── Componente Field ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ClienteDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew    = id === 'nuevo';
  const tenantId = isNew ? null : parseInt(id!, 10);

  const [tab,       setTab]       = useState<Tab>('info');
  const [tenant,    setTenant]    = useState<TenantDetalle | null>(null);
  const [planes,    setPlanes]    = useState<Plan[]>([]);
  const [pagos,     setPagos]     = useState<any[]>([]);
  const [temaConfig,setTemaConfig]= useState<any>(null);
  const [usuarios,  setUsuarios]  = useState<any[]>([]);
  const [dteList,   setDteList]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(!isNew);
  const [saving,       setSaving]       = useState(false);
  // ── Formularios Info, Pago, API ───────────────────────────────────────────────
  const [form, setForm] = useState<CreateTenantDTO & UpdateTenantDTO & { estado?: TenantEstado }>({
    nombre: '', slug: '', email_contacto: '', telefono: '',
    plan_id: undefined, fecha_pago: '', notas: '',
    admin_username: 'admin', admin_password: 'admin123', admin_nombre: 'Administrador',
  });
  const [pagoForm, setPagoForm] = useState<PagoDTO>({
    monto: 0, fecha_pago: '', metodo: '', notas: '', nueva_fecha_vencimiento: '',
  });
  // ── Formulario Tema (configuracion_tema del tenant) ───────────────────────
  const PALETAS_TEMA = [
    { name: 'Negro',         preview: '#111111', accent: '#111111', accent_text: '#ffffff', page_bg: '#f5f5f5', card_bg: '#ffffff', sidebar_bg: '#ffffff' },
    { name: 'Azul',          preview: '#2563eb', accent: '#2563eb', accent_text: '#ffffff', page_bg: '#f0f4ff', card_bg: '#ffffff', sidebar_bg: '#ffffff' },
    { name: 'Verde',         preview: '#059669', accent: '#059669', accent_text: '#ffffff', page_bg: '#f0fdf4', card_bg: '#ffffff', sidebar_bg: '#ffffff' },
    { name: 'Morado',        preview: '#7c3aed', accent: '#7c3aed', accent_text: '#ffffff', page_bg: '#faf5ff', card_bg: '#ffffff', sidebar_bg: '#ffffff' },
    { name: 'Rojo',          preview: '#dc2626', accent: '#dc2626', accent_text: '#ffffff', page_bg: '#fff7f7', card_bg: '#ffffff', sidebar_bg: '#ffffff' },
    { name: 'Oscuro',        preview: '#f59e0b', accent: '#f59e0b', accent_text: '#111111', page_bg: '#18181b', card_bg: '#27272a', sidebar_bg: '#111111' },
  ];
  const [temaForm, setTemaForm] = useState({ accent: '', accent_text: '', page_bg: '', card_bg: '', sidebar_bg: '' });

  // ── Estado Usuarios Tab ───────────────────────────────────────────────────────
  const [showUsrForm,       setShowUsrForm]       = useState(false);
  const [editingUsr,        setEditingUsr]        = useState<any | null>(null);
  const [usrForm,           setUsrForm]           = useState({ nombre: '', username: '', password: '', rol: 'usuario' });
  const [showUsrLimitEditor, setShowUsrLimitEditor] = useState(false);
  const [usrLimitInput,     setUsrLimitInput]     = useState<string>('');
  const [savingUsrLimit,    setSavingUsrLimit]    = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────────
  useEffect(() => {
    superAdminSvc.getPlanes().then(setPlanes).catch(console.error);

    if (!isNew && tenantId) {
      Promise.all([
        superAdminSvc.getTenant(tenantId),
        superAdminSvc.getPagos(tenantId),
        superAdminSvc.getUsuarios(tenantId),
        superAdminSvc.getDTE(tenantId),
        superAdminSvc.getTemaConfig(tenantId),
      ])
        .then(([t, p, u, dte, tema]) => {
          setTenant(t);
          setPagos(p);
          setUsuarios(u);
          setDteList(dte);
          setTemaConfig(tema);
          setForm({
            nombre: t.nombre, slug: t.slug, email_contacto: t.email_contacto ?? '',
            telefono: t.telefono ?? '', plan_id: t.plan_id ?? undefined,
            fecha_pago: t.fecha_pago ?? '', notas: t.notas ?? '', estado: t.estado,
          });
          setUsrLimitInput(t.max_usuarios_override != null ? String(t.max_usuarios_override) : '');
          setTemaForm({
            accent: tema?.accent ?? '', accent_text: tema?.accent_text ?? '',
            page_bg: tema?.page_bg ?? '', card_bg: tema?.card_bg ?? '',
            sidebar_bg: tema?.sidebar_bg ?? '',
          });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [tenantId, isNew]);

  // ── Guardar Info ──────────────────────────────────────────────────────────────
  const saveInfo = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const result = await superAdminSvc.createTenant(form as CreateTenantDTO);
        notify.success('Cliente creado', `Admin: ${result.admin_username} / ${result.admin_password}`);
        navigate(`/superadmin/clientes/${result.tenant.id}`);
      } else {
        const updated = await superAdminSvc.updateTenant(tenantId!, form as UpdateTenantDTO);
        setTenant(updated);
        notify.success('Cambios guardados');
      }
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };

  // ── Registrar Pago ────────────────────────────────────────────────────────────
  const savePago = async () => {
    setSaving(true);
    try {
      const pago    = await superAdminSvc.registrarPago(tenantId!, pagoForm);
      setPagos(prev => [pago, ...prev]);
      const updated = await superAdminSvc.getTenant(tenantId!);
      setTenant(updated);
      setForm(f => ({ ...f, fecha_pago: updated.fecha_pago ?? '' }));
      setPagoForm({ monto: 0, fecha_pago: '', metodo: '', notas: '', nueva_fecha_vencimiento: '' });
      notify.success('Pago registrado');
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };

  // ── Guardar Tema ──────────────────────────────────────────────────────────────
  const saveTema = async () => {
    setSaving(true);
    try {
      const result = await superAdminSvc.updateTemaConfig(tenantId!, temaForm);
      setTemaConfig(result);
      notify.success('Tema del cliente guardado');
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };

  const applyPaletaTema = async (p: typeof PALETAS_TEMA[0]) => {
    const next = { accent: p.accent, accent_text: p.accent_text, page_bg: p.page_bg, card_bg: p.card_bg, sidebar_bg: p.sidebar_bg };
    setTemaForm(next);
    setSaving(true);
    try {
      const result = await superAdminSvc.updateTemaConfig(tenantId!, next);
      setTemaConfig(result);
      notify.success('Paleta aplicada');
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };

  // ── Límite de usuarios ────────────────────────────────────────────────────────
  const saveUsrLimit = async () => {
    const newOverride = usrLimitInput.trim() === '' ? null : parseInt(usrLimitInput, 10);
    if (newOverride !== null && (isNaN(newOverride) || newOverride < 1)) {
      notify.error('Ingresa un número válido mayor a 0'); return;
    }
    setSavingUsrLimit(true);
    try {
      const updated = await superAdminSvc.updateTenant(tenantId!, { max_usuarios: newOverride });
      setTenant(updated);
      setShowUsrLimitEditor(false);
      notify.success(
        newOverride === null
          ? 'Límite de usuarios restablecido al del plan'
          : `Límite actualizado a ${newOverride} usuario${newOverride !== 1 ? 's' : ''}`
      );
    } catch (e: any) { notify.error('Error al guardar límite', e.message); }
    finally { setSavingUsrLimit(false); }
  };

  // ── CRUD Usuarios ─────────────────────────────────────────────────────────────
  const openNewUsr = () => {
    setEditingUsr(null);
    setUsrForm({ nombre: '', username: '', password: '', rol: 'usuario' });
    setShowUsrForm(true);
  };
  const openEditUsr = (u: any) => {
    setEditingUsr(u);
    setUsrForm({ nombre: u.nombre, username: u.username, password: '', rol: u.rol });
    setShowUsrForm(true);
  };
  const saveUsr = async () => {
    setSaving(true);
    try {
      if (editingUsr) {
        const updated = await superAdminSvc.updateUsuario(tenantId!, editingUsr.id, usrForm);
        setUsuarios(prev => prev.map(u => u.id === editingUsr.id ? updated : u));
        notify.success('Usuario actualizado');
      } else {
        const created = await superAdminSvc.createUsuario(tenantId!, usrForm);
        setUsuarios(prev => [...prev, created]);
        notify.success('Usuario creado');
      }
      setShowUsrForm(false);
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };
  const deleteUsr = async (userId: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await superAdminSvc.deleteUsuario(tenantId!, userId);
      setUsuarios(prev => prev.filter(u => u.id !== userId));
      notify.success('Usuario eliminado');
    } catch (e: any) { notify.error('Error', e.message); }
  };

  // ── Editar DTE ────────────────────────────────────────────────────────────────
  const [editingDTE, setEditingDTE] = useState<{ tipo: string; prefijo: string; numero_actual: number } | null>(null);
  const saveDTE = async () => {
    if (!editingDTE) return;
    setSaving(true);
    try {
      const updated = await superAdminSvc.updateDTE(tenantId!, editingDTE.tipo, {
        prefijo: editingDTE.prefijo, numero_actual: editingDTE.numero_actual,
      });
      setDteList(prev => prev.map(d => d.tipo_dte === editingDTE.tipo ? updated : d));
      setEditingDTE(null);
      notify.success('DTE actualizado');
    } catch (e: any) { notify.error('Error', e.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <p style={{ color: colors.textMuted, padding: 32, fontFamily: "'Inter', sans-serif" }}>
      Cargando...
    </p>
  );

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={{ ...S.header, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button style={S.backBtn} onClick={() => navigate('/superadmin/clientes')}>← Clientes</button>
          <h2 style={S.title}>{isNew ? 'Nuevo cliente' : tenant?.nombre}</h2>
          {!isNew && tenant && <span style={S.slugBadge}>{tenant.slug}</span>}
        </div>
        {!isNew && (
          <button
            style={{ ...S.saveBtn, background: '#6366f1', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              try {
                const { token } = await superAdminSvc.impersonateTenant(tenantId!);
                // Abrir nueva pestaña y canjear el token de impersonación
                const url = `${window.location.origin}/auth/impersonate?token=${encodeURIComponent(token)}`;
                window.open(url, '_blank');
              } catch (e: any) { notify.error('Error', e.message); }
            }}
          >
            Entrar como cliente →
          </button>
        )}
      </div>

      {/* Tabs */}
      {!isNew && (
        <div style={S.tabs}>
          {TAB_LIST.map(({ id: t, label }) => (
            <button
              key={t}
              style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab Info ─────────────────────────────────────────────────────────── */}
      {(isNew || tab === 'info') && (
        <div style={S.section}>
          <div style={S.grid2}>
            <Field label="Nombre de la empresa *">
              <input
                style={S.input}
                value={form.nombre}
                onChange={e => {
                  const nombre = e.target.value;
                  const slug   = nombre.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
                    .replace(/[^a-z0-9\s-]/g, '')
                    .trim().replace(/\s+/g, '-');
                  setForm(f => ({ ...f, nombre, ...(isNew ? { slug } : {}) }));
                }}
              />
            </Field>
            <Field label="Código de empresa (slug) *">
              <input style={S.input} value={form.slug} placeholder="ej: empresa-abc" onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              <small style={{ color: colors.textMuted }}>Los usuarios lo ingresan al hacer login. Se genera automáticamente desde el nombre.</small>
            </Field>
            <Field label="Email de contacto">
              <input style={S.input} type="email" value={form.email_contacto ?? ''} onChange={e => setForm(f => ({ ...f, email_contacto: e.target.value }))} />
            </Field>
            <Field label="Teléfono">
              <input style={S.input} value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </Field>
            <Field label="Plan">
              <select style={S.input} value={form.plan_id ?? ''} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value ? parseInt(e.target.value) : undefined }))}>
                <option value="">Sin plan</option>
                {planes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {p.max_sucursales} suc. / {p.max_usuarios} usr. — ${p.precio}
                  </option>
                ))}
              </select>
            </Field>
            {!isNew && (
              <Field label="Estado del sistema">
                <select style={S.input} value={form.estado ?? 'pruebas'} onChange={e => setForm(f => ({ ...f, estado: e.target.value as TenantEstado }))}>
                  {ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            )}
            <Field label="Fecha próximo pago">
              <input style={S.input} type="date" value={form.fecha_pago ?? ''} onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))} />
            </Field>
          </div>

          {isNew && (
            <>
              <h3 style={S.sectionTitle}>Credenciales del administrador</h3>
              <div style={S.grid2}>
                <Field label="Nombre del admin">
                  <input style={S.input} value={form.admin_nombre ?? ''} onChange={e => setForm(f => ({ ...f, admin_nombre: e.target.value }))} />
                </Field>
                <Field label="Usuario admin">
                  <input style={S.input} value={form.admin_username ?? ''} onChange={e => setForm(f => ({ ...f, admin_username: e.target.value }))} />
                </Field>
                <Field label="Password admin">
                  <input style={S.input} type="password" value={form.admin_password ?? ''} onChange={e => setForm(f => ({ ...f, admin_password: e.target.value }))} />
                </Field>
              </div>
            </>
          )}

          <Field label="Notas internas">
            <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' }} value={form.notas ?? ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </Field>

          <button style={S.saveBtn} onClick={saveInfo} disabled={saving}>
            {saving ? 'Guardando...' : isNew ? 'Crear cliente' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* ── Tab Empresa ──────────────────────────────────────────────────────── */}
      {!isNew && tab === 'empresa' && (
        <div style={S.section}>
          <EmpresaSection
            tenantId={tenantId ?? undefined}
            tenant={tenant}
            onTenantUpdated={setTenant}
          />
        </div>
      )}

      {/* ── Tab Tema ─────────────────────────────────────────────────────────── */}
      {!isNew && tab === 'tema' && (
        <div style={S.section}>
          <h3 style={S.sectionTitle}>Tema visual del cliente</h3>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: 0 }}>
            Modifica el tema que ve este cliente al ingresar al sistema. Los cambios aplican inmediatamente.
          </p>

          {/* Paletas rápidas */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Paletas predefinidas
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETAS_TEMA.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPaletaTema(p)}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 13px', background: colors.pageBg,
                    border: `1px solid ${colors.border}`, borderRadius: radius.md,
                    fontSize: 12, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
                    color: colors.textPrimary, opacity: saving ? 0.6 : 1,
                  }}
                >
                  <div style={{ width: 13, height: 13, borderRadius: '50%', background: p.preview, border: '1px solid rgba(0,0,0,0.1)' }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Colores personalizados */}
          <div style={S.grid2}>
            <Field label="Color de acento">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: radius.sm, background: temaForm.accent, border: `1px solid ${colors.border}`, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                  <input type="color" value={temaForm.accent.startsWith('#') ? temaForm.accent : '#000000'} onChange={e => setTemaForm(f => ({ ...f, accent: e.target.value }))} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                </div>
                <input style={S.input} value={temaForm.accent} onChange={e => setTemaForm(f => ({ ...f, accent: e.target.value }))} placeholder="#2563eb" />
              </div>
            </Field>
            <Field label="Texto sobre acento">
              <input style={S.input} value={temaForm.accent_text} onChange={e => setTemaForm(f => ({ ...f, accent_text: e.target.value }))} placeholder="#ffffff" />
            </Field>
            <Field label="Fondo de página">
              <input style={S.input} value={temaForm.page_bg} onChange={e => setTemaForm(f => ({ ...f, page_bg: e.target.value }))} placeholder="#f5f5f5 o linear-gradient(...)" />
            </Field>
            <Field label="Fondo de tarjetas">
              <input style={S.input} value={temaForm.card_bg} onChange={e => setTemaForm(f => ({ ...f, card_bg: e.target.value }))} placeholder="#ffffff" />
            </Field>
            <Field label="Fondo del sidebar">
              <input style={S.input} value={temaForm.sidebar_bg} onChange={e => setTemaForm(f => ({ ...f, sidebar_bg: e.target.value }))} placeholder="#ffffff" />
            </Field>
          </div>

          {/* Preview strip */}
          <div style={{ display: 'flex', height: 28, borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
            <div style={{ flex: 1, background: temaForm.page_bg || '#f5f5f5',    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>Página</div>
            <div style={{ flex: 1, background: temaForm.card_bg || '#ffffff',    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>Tarjeta</div>
            <div style={{ flex: 1, background: temaForm.sidebar_bg || '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>Sidebar</div>
            <div style={{ flex: 1, background: temaForm.accent || '#111',        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: temaForm.accent_text || '#fff' }}>Acento</div>
          </div>

          <button style={S.saveBtn} onClick={saveTema} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar tema del cliente'}
          </button>
        </div>
      )}

      {/* ── Tab Pagos ────────────────────────────────────────────────────────── */}
      {!isNew && tab === 'pagos' && (
        <div style={S.section}>
          <h3 style={S.sectionTitle}>Registrar nuevo pago</h3>
          <div style={S.grid2}>
            <Field label="Monto *">
              <input style={S.input} type="number" step="0.01" value={pagoForm.monto} onChange={e => setPagoForm(f => ({ ...f, monto: parseFloat(e.target.value) || 0 }))} />
            </Field>
            <Field label="Fecha de pago">
              <input style={S.input} type="date" value={pagoForm.fecha_pago ?? ''} onChange={e => setPagoForm(f => ({ ...f, fecha_pago: e.target.value }))} />
            </Field>
            <Field label="Método">
              <input style={S.input} placeholder="transferencia, efectivo..." value={pagoForm.metodo ?? ''} onChange={e => setPagoForm(f => ({ ...f, metodo: e.target.value }))} />
            </Field>
            <Field label="Nueva fecha de vencimiento">
              <input style={S.input} type="date" value={pagoForm.nueva_fecha_vencimiento ?? ''} onChange={e => setPagoForm(f => ({ ...f, nueva_fecha_vencimiento: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notas del pago">
            <input style={S.input} value={pagoForm.notas ?? ''} onChange={e => setPagoForm(f => ({ ...f, notas: e.target.value }))} />
          </Field>
          <button style={S.saveBtn} onClick={savePago} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar pago'}
          </button>

          <h3 style={{ ...S.sectionTitle, marginTop: 12 }}>Historial de pagos</h3>
          {pagos.length === 0 ? (
            <p style={{ color: colors.textMuted }}>Sin pagos registrados</p>
          ) : (
            <div style={S.pagoList}>
              {pagos.map(p => (
                <div key={p.id} style={S.pagoRow}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>${parseFloat(p.monto).toFixed(2)}</span>
                  <span style={{ color: colors.textMuted }}>{new Date(p.fecha_pago).toLocaleDateString('es-SV')}</span>
                  <span style={{ color: colors.textSecondary }}>{p.metodo ?? '—'}</span>
                  <span style={{ color: colors.textSecondary }}>{p.notas ?? ''}</span>
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>Por: {p.registrado_por_nombre}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Usuarios ─────────────────────────────────────────────────────── */}
      {!isNew && tab === 'usuarios' && (
        <div style={S.section}>
          {/* Header con contador y botones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ ...S.sectionTitle, marginBottom: 2 }}>Usuarios del sistema</h3>
              {tenant?.max_usuarios != null && (
                <span style={{
                  fontSize: 12,
                  color: usuarios.length >= (tenant.max_usuarios ?? 0) ? '#b45309' : colors.textMuted,
                  fontWeight: usuarios.length >= (tenant.max_usuarios ?? 0) ? 600 : 400,
                }}>
                  {usuarios.length} / {tenant.max_usuarios} usuarios
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                style={{ ...S.secondaryBtn, display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => setShowUsrLimitEditor(v => !v)}
              >
                ⚙ Límite
              </button>
              <button style={S.saveBtn} onClick={openNewUsr}>+ Nuevo usuario</button>
            </div>
          </div>

          {/* Editor de límite de usuarios */}
          {showUsrLimitEditor && (
            <div style={S.inlineForm}>
              <h4 style={{ ...S.sectionTitle, fontSize: 12, marginBottom: 8 }}>CONFIGURAR LÍMITE DE USUARIOS</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Máximo de usuarios</label>
                  <input
                    style={{ ...S.input, width: 140 }}
                    type="number" min="1"
                    value={usrLimitInput}
                    onChange={e => setUsrLimitInput(e.target.value)}
                    placeholder="Vacío = usar plan"
                  />
                </div>
                <span style={{ fontSize: 12, color: colors.textMuted, paddingBottom: 8 }}>
                  Dejar vacío para usar el límite del plan.
                  {tenant?.max_usuarios_override != null && (
                    <span style={{ color: '#d97706', marginLeft: 6 }}>Override activo: {tenant.max_usuarios_override}</span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={S.saveBtn} onClick={saveUsrLimit} disabled={savingUsrLimit}>
                  {savingUsrLimit ? 'Guardando...' : 'Guardar límite'}
                </button>
                <button style={S.secondaryBtn} onClick={() => setShowUsrLimitEditor(false)}>Cancelar</button>
                {tenant?.max_usuarios_override != null && (
                  <button
                    style={{ ...S.secondaryBtn, color: '#dc2626', borderColor: '#dc2626', marginLeft: 'auto' }}
                    onClick={() => setUsrLimitInput('')}
                  >
                    Quitar override
                  </button>
                )}
              </div>
            </div>
          )}

          {showUsrForm && (
            <div style={S.inlineForm}>
              <h4 style={{ ...S.sectionTitle, fontSize: 13 }}>{editingUsr ? 'Editar usuario' : 'Nuevo usuario'}</h4>
              <div style={S.grid2}>
                <Field label="Nombre completo *">
                  <input style={S.input} value={usrForm.nombre} onChange={e => setUsrForm(f => ({ ...f, nombre: e.target.value }))} />
                </Field>
                <Field label="Username *">
                  <input style={S.input} value={usrForm.username} onChange={e => setUsrForm(f => ({ ...f, username: e.target.value }))} />
                </Field>
                <Field label={editingUsr ? 'Nueva contraseña (vacío = sin cambio)' : 'Contraseña *'}>
                  <input style={S.input} type="password" value={usrForm.password} onChange={e => setUsrForm(f => ({ ...f, password: e.target.value }))} />
                </Field>
                <Field label="Rol">
                  <select style={S.input} value={usrForm.rol} onChange={e => setUsrForm(f => ({ ...f, rol: e.target.value }))}>
                    <option value="usuario">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={S.saveBtn} onClick={saveUsr} disabled={saving}>
                  {saving ? 'Guardando...' : editingUsr ? 'Actualizar' : 'Crear usuario'}
                </button>
                <button style={S.secondaryBtn} onClick={() => setShowUsrForm(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {usuarios.length === 0 ? (
            <p style={{ color: colors.textMuted }}>Sin usuarios registrados</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {['Nombre', 'Username', 'Rol', 'Acciones'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={S.td}>{u.nombre}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', color: colors.textMuted }}>{u.username}</td>
                    <td style={S.td}>
                      <span style={{
                        background: u.rol === 'admin' ? '#7c3aed22' : colors.mutedBg,
                        color: u.rol === 'admin' ? '#a78bfa' : colors.textSecondary,
                        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>
                        {u.rol}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button style={S.secondaryBtn} onClick={() => openEditUsr(u)}>Editar</button>
                        <button
                          style={{ ...S.secondaryBtn, color: '#f59e0b', borderColor: '#f59e0b' }}
                          onClick={async () => {
                            if (!confirm(`¿Resetear contraseña de "${u.username}"? Se generará una contraseña temporal.`)) return;
                            try {
                              const r = await superAdminSvc.resetPassword(tenantId!, u.id);
                              notify.success(`Nueva contraseña de ${r.username}`, r.nueva_password);
                            } catch (e: any) { notify.error('Error', e.message); }
                          }}
                        >
                          Resetear
                        </button>
                        <button style={S.dangerBtn} onClick={() => deleteUsr(u.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab DTE ──────────────────────────────────────────────────────────── */}
      {!isNew && tab === 'dte' && (
        <div style={S.section}>
          <h3 style={S.sectionTitle}>Correlativos DTE</h3>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: 0 }}>
            Cada tipo de documento tiene su propio correlativo por punto de venta.
            Aquí puedes ajustar el prefijo y el número actual para cada tipo.
          </p>

          {dteList.length === 0 ? (
            <p style={{ color: colors.textMuted }}>Sin correlativos registrados</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {['Tipo DTE', 'Prefijo', 'Número actual', 'Punto de venta', 'Acciones'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dteList.map((d, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 600 }}>{d.tipo_dte}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', color: colors.textMuted }}>{d.prefijo}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace' }}>{d.numero_actual}</td>
                    <td style={{ ...S.td, color: colors.textSecondary }}>{d.punto_venta_nombre ?? d.punto_venta_id ?? '—'}</td>
                    <td style={S.td}>
                      <button
                        style={S.secondaryBtn}
                        onClick={() => setEditingDTE({ tipo: d.tipo_dte, prefijo: d.prefijo, numero_actual: d.numero_actual })}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {editingDTE && (
            <div style={S.inlineForm}>
              <h4 style={{ ...S.sectionTitle, fontSize: 13 }}>Editar DTE: {editingDTE.tipo}</h4>
              <div style={S.grid2}>
                <Field label="Prefijo">
                  <input style={S.input} value={editingDTE.prefijo} onChange={e => setEditingDTE(d => d && ({ ...d, prefijo: e.target.value }))} />
                </Field>
                <Field label="Número actual">
                  <input style={S.input} type="number" value={editingDTE.numero_actual} onChange={e => setEditingDTE(d => d && ({ ...d, numero_actual: parseInt(e.target.value) || 0 }))} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={S.saveBtn} onClick={saveDTE} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button style={S.secondaryBtn} onClick={() => setEditingDTE(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Sucursales ───────────────────────────────────────────────────── */}
      {!isNew && tab === 'sucursales' && tenantId && (
        <div style={S.section}>
          <SucursalesSection
            tenantId={tenantId}
            maxSucursales={tenant?.max_sucursales ?? undefined}
            maxSucursalesOverride={tenant?.max_sucursales_override ?? undefined}
            onLimitSaved={(newEffective, newOverride) => {
              setTenant(t => t ? {
                ...t,
                max_sucursales:          newEffective,
                max_sucursales_override: newOverride,
              } : t);
            }}
            maxPuntosVenta={tenant?.max_puntos_venta ?? undefined}
            maxPuntosVentaOverride={tenant?.max_puntos_venta_override ?? undefined}
            onPvLimitSaved={(newEffective, newOverride) => {
              setTenant(t => t ? {
                ...t,
                max_puntos_venta:          newEffective,
                max_puntos_venta_override: newOverride,
              } : t);
            }}
          />
        </div>
      )}

      {/* ── Tab API MH ───────────────────────────────────────────────────────── */}
      {!isNew && tab === 'api' && tenantId && (
        <div style={S.section}>
          <APIHaciendaSection tenantId={tenantId} />
        </div>
      )}

      {/* ── Tab Firma ────────────────────────────────────────────────────────── */}
      {!isNew && tab === 'firma' && tenantId && (
        <div style={S.section}>
          <FirmaElectronicaSection tenantId={tenantId} />
        </div>
      )}
    </div>
  );
}
