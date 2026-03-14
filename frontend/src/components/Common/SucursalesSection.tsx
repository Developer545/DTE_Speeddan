/**
 * SucursalesSection.tsx — Componente compartido de Sucursales y Puntos de Venta.
 *
 *   - Sin tenantId → modo cliente: el tenant gestiona sus propias sucursales.
 *   - Con tenantId → modo admin: el SuperAdmin gestiona las sucursales del tenant.
 *
 * Ambos modos tienen CRUD completo de sucursales y puntos de venta.
 */

import React, { useEffect, useState } from 'react';
import {
  Building, Plus, Edit2, Trash2,
  ChevronDown, ChevronRight,
  Monitor, Save, X, AlertTriangle, Settings,
} from 'lucide-react';
import { colors, radius } from '../../styles/colors';
import {
  getSucursales    as clientGetSucursales,
  createSucursal   as clientCreateSucursal,
  updateSucursal   as clientUpdateSucursal,
  deleteSucursal   as clientDeleteSucursal,
  getPuntosVenta   as clientGetPuntosVenta,
  createPuntoVenta as clientCreatePuntoVenta,
  updatePuntoVenta as clientUpdatePuntoVenta,
  deletePuntoVenta as clientDeletePuntoVenta,
  type Sucursal, type PuntoVenta,
} from '../../services/config.service';
import { superAdminSvc } from '../../superadmin/services/superadmin.service';
import { notify } from '../../utils/notify';

// ── Estilos ───────────────────────────────────────────────────────────────────

const inputS: React.CSSProperties = {
  width: '100%', padding: '8px 11px',
  border: `1px solid ${colors.border}`, borderRadius: radius.sm,
  fontSize: 13, color: colors.textPrimary, background: colors.inputBg,
  outline: 'none', boxSizing: 'border-box',
};
const labelS: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: colors.textMuted,
  display: 'block', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};
const btnPrimary = (disabled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', background: disabled ? '#c8c8c8' : colors.accent,
  color: colors.accentText, border: 'none',
  borderRadius: radius.sm, fontSize: 12, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
});
const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '5px 10px', background: 'none',
  color: colors.textMuted, border: `1px solid ${colors.border}`,
  borderRadius: radius.sm, fontSize: 12, cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  ...btnGhost, color: colors.danger, borderColor: colors.dangerBorder,
};

// ── Tipos internos ────────────────────────────────────────────────────────────

interface SucursalForm {
  nombre: string; codigo: string; codigo_mh: string;
  direccion: string; telefono: string; correo: string; activo: boolean;
}
const EMPTY_SUC: SucursalForm = {
  nombre: '', codigo: '', codigo_mh: '', direccion: '',
  telefono: '', correo: '', activo: true,
};

interface PVForm { nombre: string; codigo: string; codigo_mh: string; activo: boolean; }
const EMPTY_PV: PVForm = { nombre: '', codigo: '', codigo_mh: '', activo: true };

// ── Abstracción de servicios según contexto ───────────────────────────────────

interface SvcAdapter {
  getSucursales:    ()                                    => Promise<Sucursal[]>;
  createSucursal:   (dto: any)                            => Promise<Sucursal>;
  updateSucursal:   (id: number, dto: any)                => Promise<Sucursal>;
  deleteSucursal:   (id: number)                          => Promise<any>;
  getPuntosVenta:   (sucId: number)                       => Promise<PuntoVenta[]>;
  createPuntoVenta: (sucId: number, dto: any)             => Promise<PuntoVenta>;
  updatePuntoVenta: (sucId: number, pvId: number, dto: any) => Promise<PuntoVenta>;
  deletePuntoVenta: (sucId: number, pvId: number)         => Promise<any>;
}

function buildSvc(tenantId?: number): SvcAdapter {
  if (tenantId !== undefined) {
    return {
      getSucursales:    ()              => superAdminSvc.getSucursales(tenantId),
      createSucursal:   (dto)           => superAdminSvc.createSucursal(tenantId, dto),
      updateSucursal:   (id, dto)       => superAdminSvc.updateSucursal(tenantId, id, dto),
      deleteSucursal:   (id)            => superAdminSvc.deleteSucursal(tenantId, id),
      getPuntosVenta:   (sucId)         => superAdminSvc.getPuntosVenta(tenantId, sucId),
      createPuntoVenta: (sucId, dto)    => superAdminSvc.createPuntoVenta(tenantId, sucId, dto),
      updatePuntoVenta: (sucId, pvId, dto) => superAdminSvc.updatePuntoVenta(tenantId, sucId, pvId, dto),
      deletePuntoVenta: (sucId, pvId)   => superAdminSvc.deletePuntoVenta(tenantId, sucId, pvId),
    };
  }
  return {
    getSucursales:    ()              => clientGetSucursales(),
    createSucursal:   (dto)           => clientCreateSucursal(dto),
    updateSucursal:   (id, dto)       => clientUpdateSucursal(id, dto),
    deleteSucursal:   (id)            => clientDeleteSucursal(id),
    getPuntosVenta:   (sucId)         => clientGetPuntosVenta(sucId),
    createPuntoVenta: (_sucId, dto)   => clientCreatePuntoVenta(dto),
    updatePuntoVenta: (_sucId, pvId, dto) => clientUpdatePuntoVenta(pvId, dto),
    deletePuntoVenta: (_sucId, pvId)  => clientDeletePuntoVenta(pvId),
  };
}

// ── PuntoVentaRow ─────────────────────────────────────────────────────────────

function PuntoVentaRow({
  pv, sucId, svc, onSaved, onDelete,
}: {
  pv: PuntoVenta; sucId: number;
  svc: SvcAdapter; onSaved: () => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState<PVForm>({
    nombre: pv.nombre, codigo: pv.codigo,
    codigo_mh: pv.codigo_mh ?? '', activo: pv.activo,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await svc.updatePuntoVenta(sucId, pv.id, { ...form, codigo_mh: form.codigo_mh || undefined });
      setEditing(false);
      onSaved();
      notify.success('Punto de venta actualizado');
    } catch (e: any) { notify.error('Error al guardar', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div style={{ padding: '10px 14px', background: colors.pageBg, borderRadius: radius.sm, marginBottom: 6, border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px', marginBottom: 10 }}>
          <div><label style={labelS}>Nombre</label><input style={inputS} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
          <div><label style={labelS}>Código (Px)</label><input style={inputS} value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="P001" /></div>
          <div><label style={labelS}>Código MH</label><input style={inputS} value={form.codigo_mh} onChange={e => setForm(f => ({ ...f, codigo_mh: e.target.value }))} placeholder="Asignado por MH" /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btnPrimary(saving)} onClick={save} disabled={saving}><Save size={12} />{saving ? 'Guardando...' : 'Guardar'}</button>
          <button style={btnGhost} onClick={() => setEditing(false)}><X size={12} />Cancelar</button>
          <label style={{ fontSize: 12, color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
            Activo
          </label>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: colors.pageBg, borderRadius: radius.sm, marginBottom: 5, border: `1px solid ${colors.borderLight}` }}>
      <Monitor size={13} color={pv.activo ? colors.success : colors.textMuted} />
      <span style={{ fontSize: 13, fontWeight: 600, color: pv.activo ? colors.textPrimary : colors.textMuted, flex: 1 }}>
        {pv.nombre}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, background: colors.mutedBg, padding: '2px 8px', borderRadius: radius.sm, color: colors.textSecondary }}>{pv.codigo}</span>
      {pv.prefijo && (
        <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f0f4ff', padding: '2px 8px', borderRadius: radius.sm, color: '#4f46e5' }}>
          {pv.prefijo}
        </span>
      )}
      <button style={btnGhost} onClick={() => setEditing(true)}><Edit2 size={12} /></button>
      <button style={btnDanger} onClick={onDelete}><Trash2 size={12} /></button>
    </div>
  );
}

// ── SucursalCard ──────────────────────────────────────────────────────────────

function SucursalCard({
  suc, svc, onReload, pvLimitReached, onPvCountChange,
}: {
  suc: Sucursal; svc: SvcAdapter; onReload: () => void;
  pvLimitReached?: boolean;
  onPvCountChange?: (sucId: number, count: number) => void;
}) {
  const [open,       setOpen]       = useState(suc.id === 1);
  const [pvList,     setPvList]     = useState<PuntoVenta[]>([]);
  const [loadingPV,  setLoadingPV]  = useState(false);
  const [editingSuc, setEditingSuc] = useState(false);
  const [addingPV,   setAddingPV]   = useState(false);
  const [sucForm,    setSucForm]    = useState<SucursalForm>({
    nombre: suc.nombre, codigo: suc.codigo, codigo_mh: suc.codigo_mh ?? '',
    direccion: suc.direccion ?? '', telefono: suc.telefono ?? '',
    correo: suc.correo ?? '', activo: suc.activo,
  });
  const [pvForm,  setPvForm]  = useState<PVForm>(EMPTY_PV);
  const [saving,  setSaving]  = useState(false);

  const loadPV = async () => {
    setLoadingPV(true);
    try { setPvList(await svc.getPuntosVenta(suc.id)); }
    finally { setLoadingPV(false); }
  };

  useEffect(() => { if (open) loadPV(); }, [open]);
  // Reportar count al padre cada vez que cambia la lista
  useEffect(() => { onPvCountChange?.(suc.id, pvList.length); }, [pvList.length]);

  const saveSuc = async () => {
    setSaving(true);
    try {
      await svc.updateSucursal(suc.id, { ...sucForm, codigo_mh: sucForm.codigo_mh || undefined });
      setEditingSuc(false);
      onReload();
      notify.success('Sucursal actualizada');
    } catch (e: any) { notify.error('Error al guardar', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  const addPV = async () => {
    if (!pvForm.nombre || !pvForm.codigo) { notify.error('Nombre y código son requeridos'); return; }
    setSaving(true);
    try {
      await svc.createPuntoVenta(suc.id, { ...pvForm, sucursal_id: suc.id, codigo_mh: pvForm.codigo_mh || undefined });
      setPvForm(EMPTY_PV);
      setAddingPV(false);
      loadPV();
      notify.success('Punto de venta creado');
    } catch (e: any) { notify.error('Error al crear', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  const delPV = async (pvId: number) => {
    if (!confirm('¿Eliminar este punto de venta?')) return;
    try { await svc.deletePuntoVenta(suc.id, pvId); loadPV(); notify.success('Punto de venta eliminado'); }
    catch (e: any) { notify.error('Error al eliminar', e.response?.data?.message); }
  };

  return (
    <div style={{ background: colors.cardBg, borderRadius: radius.lg, border: `1px solid ${colors.border}`, marginBottom: 14, overflow: 'hidden' }}>

      {/* Header sucursal */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', cursor: 'pointer', background: open ? colors.pageBg : colors.cardBg }}
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown size={15} color={colors.textMuted} /> : <ChevronRight size={15} color={colors.textMuted} />}
        <Building size={15} color={colors.accent} />
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, flex: 1 }}>{suc.nombre}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, background: colors.mutedBg, padding: '2px 10px', borderRadius: radius.sm, color: colors.textSecondary }}>{suc.codigo}</span>
        {suc.codigo_mh && <span style={{ fontSize: 11, color: colors.textMuted }}>MH: {suc.codigo_mh}</span>}
        {!suc.activo && <span style={{ fontSize: 11, color: colors.danger }}>Inactiva</span>}
        <button style={{ ...btnGhost, marginLeft: 4 }} onClick={e => { e.stopPropagation(); setEditingSuc(v => !v); }}>
          <Edit2 size={12} />
        </button>
        <button
          style={btnDanger}
          onClick={async e => {
            e.stopPropagation();
            if (!confirm('¿Eliminar esta sucursal y todos sus puntos de venta?')) return;
            try { await svc.deleteSucursal(suc.id); onReload(); notify.success('Sucursal eliminada'); }
            catch (ex: any) { notify.error('Error al eliminar', ex.response?.data?.message); }
          }}
        ><Trash2 size={12} /></button>
      </div>

      {/* Formulario editar sucursal */}
      {editingSuc && (
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${colors.borderLight}`, background: colors.pageBg }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px', marginBottom: 10 }}>
            <div><label style={labelS}>Nombre</label><input style={inputS} value={sucForm.nombre} onChange={e => setSucForm(f => ({ ...f, nombre: e.target.value }))} /></div>
            <div><label style={labelS}>Código (Mx)</label><input style={inputS} value={sucForm.codigo} onChange={e => setSucForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} /></div>
            <div><label style={labelS}>Código MH</label><input style={inputS} value={sucForm.codigo_mh} onChange={e => setSucForm(f => ({ ...f, codigo_mh: e.target.value }))} placeholder="Asignado por MH" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelS}>Dirección</label><input style={inputS} value={sucForm.direccion} onChange={e => setSucForm(f => ({ ...f, direccion: e.target.value }))} /></div>
            <div><label style={labelS}>Teléfono</label><input style={inputS} value={sucForm.telefono} onChange={e => setSucForm(f => ({ ...f, telefono: e.target.value }))} /></div>
            <div><label style={labelS}>Correo</label><input style={inputS} value={sucForm.correo} onChange={e => setSucForm(f => ({ ...f, correo: e.target.value }))} type="email" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={btnPrimary(saving)} onClick={saveSuc} disabled={saving}><Save size={12} />{saving ? 'Guardando...' : 'Guardar'}</button>
            <button style={btnGhost} onClick={() => setEditingSuc(false)}><X size={12} />Cancelar</button>
            <label style={{ fontSize: 12, color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
              <input type="checkbox" checked={sucForm.activo} onChange={e => setSucForm(f => ({ ...f, activo: e.target.checked }))} />Activa
            </label>
          </div>
        </div>
      )}

      {/* Puntos de venta */}
      {open && (
        <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${colors.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pvLimitReached ? 8 : 10 }}>
            <Monitor size={13} color={colors.textMuted} />
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Puntos de Venta
            </span>
            {!pvLimitReached && (
              <button style={{ ...btnPrimary(), marginLeft: 'auto' }} onClick={() => setAddingPV(v => !v)}>
                <Plus size={12} /> Agregar
              </button>
            )}
          </div>

          {/* Mini-banner límite PV alcanzado (modo cliente) */}
          {pvLimitReached && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', marginBottom: 10,
              background: '#fffbeb', border: '1px solid #fbbf24',
              borderRadius: radius.sm, fontSize: 12, color: '#92400e',
            }}>
              <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0 }} />
              Límite de puntos de venta alcanzado. Comunícate con soporte para ampliar tu plan.
            </div>
          )}

          {loadingPV && <div style={{ fontSize: 12, color: colors.textMuted }}>Cargando...</div>}

          {pvList.map(pv => (
            <PuntoVentaRow
              key={pv.id} pv={pv} sucId={suc.id} svc={svc}
              onSaved={loadPV} onDelete={() => delPV(pv.id)}
            />
          ))}

          {pvList.length === 0 && !loadingPV && (
            <div style={{ fontSize: 12, color: colors.textMuted, padding: '8px 0' }}>Sin puntos de venta</div>
          )}

          {/* Formulario agregar punto de venta */}
          {addingPV && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: colors.pageBg, borderRadius: radius.sm, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 10 }}>NUEVO PUNTO DE VENTA</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px', marginBottom: 10 }}>
                <div><label style={labelS}>Nombre</label><input style={inputS} value={pvForm.nombre} onChange={e => setPvForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Caja 1" /></div>
                <div>
                  <label style={labelS}>Código (Px)</label>
                  <input style={inputS} value={pvForm.codigo} onChange={e => setPvForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="P002" />
                  {pvForm.codigo && <div style={{ fontSize: 11, color: '#4f46e5', marginTop: 2 }}>Prefijo: {suc.codigo}{pvForm.codigo}</div>}
                </div>
                <div><label style={labelS}>Código MH</label><input style={inputS} value={pvForm.codigo_mh} onChange={e => setPvForm(f => ({ ...f, codigo_mh: e.target.value }))} placeholder="Asignado por MH" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnPrimary(saving)} onClick={addPV} disabled={saving}><Plus size={12} />{saving ? 'Guardando...' : 'Crear'}</button>
                <button style={btnGhost} onClick={() => { setAddingPV(false); setPvForm(EMPTY_PV); }}><X size={12} />Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  tenantId?:                  number;
  /** Límite efectivo de sucursales (COALESCE override + plan). */
  maxSucursales?:             number;
  maxSucursalesOverride?:     number | null;
  onLimitSaved?:              (newEffective: number | null, newOverride: number | null) => void;
  /** Límite efectivo de puntos de venta (total del tenant). */
  maxPuntosVenta?:            number;
  maxPuntosVentaOverride?:    number | null;
  onPvLimitSaved?:            (newEffective: number | null, newOverride: number | null) => void;
}

export function SucursalesSection({
  tenantId, maxSucursales, maxSucursalesOverride, onLimitSaved,
  maxPuntosVenta, maxPuntosVentaOverride, onPvLimitSaved,
}: Props) {
  const svc      = buildSvc(tenantId);
  const isAdmin  = tenantId !== undefined;

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [addingSuc,  setAddingSuc]  = useState(false);
  const [sucForm,    setSucForm]    = useState<SucursalForm>(EMPTY_SUC);
  const [saving,     setSaving]     = useState(false);

  // ── Tracking de PV por sucursal (para el contador total) ─────────────────
  const [pvCounts, setPvCounts] = useState<Record<number, number>>({});
  const totalPv = Object.values(pvCounts).reduce((sum, n) => sum + n, 0);

  const handlePvCountChange = (sucId: number, count: number) => {
    setPvCounts(prev => ({ ...prev, [sucId]: count }));
  };

  // ── Estado del editor de límite sucursales (solo admin) ───────────────────
  const [showLimitEditor, setShowLimitEditor] = useState(false);
  const [limitInput,      setLimitInput]      = useState<string>(
    maxSucursalesOverride != null ? String(maxSucursalesOverride) : ''
  );
  const [savingLimit, setSavingLimit] = useState(false);

  // ── Estado del editor de límite PV (solo admin) ───────────────────────────
  const [showPvLimitEditor, setShowPvLimitEditor] = useState(false);
  const [pvLimitInput,      setPvLimitInput]      = useState<string>(
    maxPuntosVentaOverride != null ? String(maxPuntosVentaOverride) : ''
  );
  const [savingPvLimit, setSavingPvLimit] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setSucursales(await svc.getSucursales()); }
    catch { notify.error('No se pudieron cargar las sucursales'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tenantId]);
  useEffect(() => {
    setLimitInput(maxSucursalesOverride != null ? String(maxSucursalesOverride) : '');
  }, [maxSucursalesOverride]);
  useEffect(() => {
    setPvLimitInput(maxPuntosVentaOverride != null ? String(maxPuntosVentaOverride) : '');
  }, [maxPuntosVentaOverride]);

  const saveLimit = async () => {
    if (!isAdmin || !tenantId) return;
    const newOverride = limitInput.trim() === '' ? null : parseInt(limitInput, 10);
    if (newOverride !== null && (isNaN(newOverride) || newOverride < 1)) {
      notify.error('Ingresa un número válido mayor a 0');
      return;
    }
    setSavingLimit(true);
    try {
      const { superAdminSvc } = await import('../../superadmin/services/superadmin.service');
      const updated = await superAdminSvc.updateTenant(tenantId, { max_sucursales: newOverride });
      const newEffective = (updated as any).max_sucursales ?? null;
      onLimitSaved?.(newEffective, newOverride);
      setShowLimitEditor(false);
      notify.success(
        newOverride === null
          ? 'Límite restablecido al del plan'
          : `Límite actualizado a ${newOverride} sucursal${newOverride !== 1 ? 'es' : ''}`
      );
    } catch (e: any) { notify.error('Error al guardar límite', e.message); }
    finally { setSavingLimit(false); }
  };

  const savePvLimit = async () => {
    if (!isAdmin || !tenantId) return;
    const newOverride = pvLimitInput.trim() === '' ? null : parseInt(pvLimitInput, 10);
    if (newOverride !== null && (isNaN(newOverride) || newOverride < 1)) {
      notify.error('Ingresa un número válido mayor a 0');
      return;
    }
    setSavingPvLimit(true);
    try {
      const { superAdminSvc } = await import('../../superadmin/services/superadmin.service');
      const updated = await superAdminSvc.updateTenant(tenantId, { max_puntos_venta: newOverride });
      const newEffective = (updated as any).max_puntos_venta ?? null;
      onPvLimitSaved?.(newEffective, newOverride);
      setShowPvLimitEditor(false);
      notify.success(
        newOverride === null
          ? 'Límite de PV restablecido al del plan'
          : `Límite de PV actualizado a ${newOverride} punto${newOverride !== 1 ? 's' : ''} de venta`
      );
    } catch (e: any) { notify.error('Error al guardar límite', e.message); }
    finally { setSavingPvLimit(false); }
  };

  const addSuc = async () => {
    if (!sucForm.nombre || !sucForm.codigo) { notify.error('Nombre y código son requeridos'); return; }
    setSaving(true);
    try {
      await svc.createSucursal({ ...sucForm, codigo_mh: sucForm.codigo_mh || undefined });
      setSucForm(EMPTY_SUC);
      setAddingSuc(false);
      load();
      notify.success('Sucursal creada');
    } catch (e: any) { notify.error('Error al crear', e.response?.data?.message ?? e.message); }
    finally { setSaving(false); }
  };

  // Límite sucursales alcanzado (solo bloquea en modo cliente)
  const limiteAlcanzado = !isAdmin && maxSucursales !== undefined && sucursales.length >= maxSucursales;
  // Límite PV alcanzado (solo bloquea en modo cliente)
  const pvLimitReached  = !isAdmin && maxPuntosVenta !== undefined && totalPv >= maxPuntosVenta;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Building size={18} color={colors.textSecondary} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
          Sucursales y Puntos de Venta
        </h2>

        {/* Botón "Nueva Sucursal" — oculto si cliente alcanzó el límite */}
        {!limiteAlcanzado && (
          <button style={{ ...btnPrimary(), marginLeft: 'auto' }} onClick={() => setAddingSuc(v => !v)}>
            <Plus size={13} /> Nueva Sucursal
          </button>
        )}

        {/* Botones de configurar límite — solo admin */}
        {isAdmin && (
          <>
            <button
              style={{ ...btnGhost, marginLeft: limiteAlcanzado ? 'auto' : 0 }}
              onClick={() => { setShowLimitEditor(v => !v); setShowPvLimitEditor(false); }}
              title="Configurar límite de sucursales"
            >
              <Settings size={13} /> Sucursales
            </button>
            <button
              style={btnGhost}
              onClick={() => { setShowPvLimitEditor(v => !v); setShowLimitEditor(false); }}
              title="Configurar límite de puntos de venta"
            >
              <Settings size={13} /> Puntos Venta
            </button>
          </>
        )}
      </div>

      <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>
        Cada punto de venta genera su propio correlativo DTE. El prefijo = código sucursal + código punto de venta.
      </p>

      {/* Contadores de límite */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, marginTop: 0 }}>
        {maxSucursales !== undefined && (
          <p style={{
            fontSize: 12, margin: 0,
            color: sucursales.length >= maxSucursales ? '#b45309' : colors.textMuted,
            fontWeight: sucursales.length >= maxSucursales ? 600 : 400,
          }}>
            {sucursales.length} / {maxSucursales} sucursales
          </p>
        )}
        {maxPuntosVenta !== undefined && (
          <p style={{
            fontSize: 12, margin: 0,
            color: totalPv >= maxPuntosVenta ? '#b45309' : colors.textMuted,
            fontWeight: totalPv >= maxPuntosVenta ? 600 : 400,
          }}>
            {totalPv} / {maxPuntosVenta} puntos de venta
          </p>
        )}
      </div>

      {/* ── Banner de límite alcanzado (modo cliente) ─────────────────────── */}
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
              Límite de sucursales alcanzado
            </div>
            <div style={{ fontSize: 13, color: '#78350f' }}>
              Tu plan permite hasta <strong>{maxSucursales}</strong> sucursal{maxSucursales !== 1 ? 'es' : ''}.
              Para agregar más sucursales, comunícate con soporte para ampliar tu plan.
            </div>
          </div>
        </div>
      )}

      {/* ── Banner PV alcanzado (modo cliente) ───────────────────────────── */}
      {pvLimitReached && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 18px', marginBottom: 20,
          background: '#fffbeb', border: '1px solid #fbbf24',
          borderRadius: radius.lg,
        }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
              Límite de puntos de venta alcanzado
            </div>
            <div style={{ fontSize: 13, color: '#78350f' }}>
              Tu plan permite hasta <strong>{maxPuntosVenta}</strong> punto{maxPuntosVenta !== 1 ? 's' : ''} de venta en total.
              Para agregar más, comunícate con soporte para ampliar tu plan.
            </div>
          </div>
        </div>
      )}

      {/* ── Editor de límite sucursales (solo admin) ──────────────────────── */}
      {isAdmin && showLimitEditor && (
        <div style={{
          padding: '14px 18px', background: colors.pageBg,
          border: `1px solid ${colors.border}`, borderRadius: radius.lg,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Configurar límite de sucursales
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 160px' }}>
              <label style={labelS}>Máximo de sucursales</label>
              <input
                style={{ ...inputS, width: '100%' }}
                type="number" min="1"
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                placeholder="Dejar vacío = usar plan"
              />
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, paddingBottom: 9, flex: 1 }}>
              Dejar en blanco para usar el límite del plan contratado.
              {maxSucursalesOverride != null && (
                <span style={{ color: '#d97706', marginLeft: 6 }}>
                  Override activo: {maxSucursalesOverride}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={btnPrimary(savingLimit)} onClick={saveLimit} disabled={savingLimit}>
              <Save size={12} />{savingLimit ? 'Guardando...' : 'Guardar límite'}
            </button>
            <button style={btnGhost} onClick={() => setShowLimitEditor(false)}>
              <X size={12} />Cancelar
            </button>
            {maxSucursalesOverride != null && (
              <button
                style={{ ...btnGhost, color: '#dc2626', borderColor: '#fca5a5', marginLeft: 'auto' }}
                onClick={() => { setLimitInput(''); }}
                title="Quitar el override y usar el límite del plan"
              >
                Quitar override
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Editor de límite PV (solo admin) ─────────────────────────────── */}
      {isAdmin && showPvLimitEditor && (
        <div style={{
          padding: '14px 18px', background: colors.pageBg,
          border: `1px solid ${colors.border}`, borderRadius: radius.lg,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Configurar límite de puntos de venta
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 180px' }}>
              <label style={labelS}>Total de puntos de venta</label>
              <input
                style={{ ...inputS, width: '100%' }}
                type="number" min="1"
                value={pvLimitInput}
                onChange={e => setPvLimitInput(e.target.value)}
                placeholder="Dejar vacío = usar plan"
              />
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, paddingBottom: 9, flex: 1 }}>
              Límite total sumando todos los puntos de venta del tenant.
              {maxPuntosVentaOverride != null && (
                <span style={{ color: '#d97706', marginLeft: 6 }}>
                  Override activo: {maxPuntosVentaOverride}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={btnPrimary(savingPvLimit)} onClick={savePvLimit} disabled={savingPvLimit}>
              <Save size={12} />{savingPvLimit ? 'Guardando...' : 'Guardar límite'}
            </button>
            <button style={btnGhost} onClick={() => setShowPvLimitEditor(false)}>
              <X size={12} />Cancelar
            </button>
            {maxPuntosVentaOverride != null && (
              <button
                style={{ ...btnGhost, color: '#dc2626', borderColor: '#fca5a5', marginLeft: 'auto' }}
                onClick={() => setPvLimitInput('')}
                title="Quitar el override y usar el límite del plan"
              >
                Quitar override
              </button>
            )}
          </div>
        </div>
      )}

      {/* Formulario nueva sucursal */}
      {addingSuc && (
        <div style={{ padding: '16px 18px', background: colors.pageBg, borderRadius: radius.lg, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 12 }}>NUEVA SUCURSAL</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px', marginBottom: 12 }}>
            <div>
              <label style={labelS}>Nombre *</label>
              <input style={inputS} value={sucForm.nombre} onChange={e => setSucForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Sucursal Santa Ana" />
            </div>
            <div>
              <label style={labelS}>Código (Mx) *</label>
              <input style={inputS} value={sucForm.codigo} onChange={e => setSucForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="M002" />
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Formato: M001, M002...</div>
            </div>
            <div><label style={labelS}>Código MH</label><input style={inputS} value={sucForm.codigo_mh} onChange={e => setSucForm(f => ({ ...f, codigo_mh: e.target.value }))} placeholder="Asignado por Hacienda" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelS}>Dirección</label><input style={inputS} value={sucForm.direccion} onChange={e => setSucForm(f => ({ ...f, direccion: e.target.value }))} /></div>
            <div><label style={labelS}>Teléfono</label><input style={inputS} value={sucForm.telefono} onChange={e => setSucForm(f => ({ ...f, telefono: e.target.value }))} /></div>
            <div><label style={labelS}>Correo</label><input style={inputS} value={sucForm.correo} onChange={e => setSucForm(f => ({ ...f, correo: e.target.value }))} type="email" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnPrimary(saving)} onClick={addSuc} disabled={saving}><Plus size={12} />{saving ? 'Creando...' : 'Crear Sucursal'}</button>
            <button style={btnGhost} onClick={() => { setAddingSuc(false); setSucForm(EMPTY_SUC); }}><X size={12} />Cancelar</button>
          </div>
        </div>
      )}

      {sucursales.map(s => (
        <SucursalCard
          key={s.id} suc={s} svc={svc} onReload={load}
          pvLimitReached={pvLimitReached}
          onPvCountChange={handlePvCountChange}
        />
      ))}

      {sucursales.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>No hay sucursales registradas</div>
      )}
    </div>
  );
}
