/**
 * EmpresaSection.tsx — Información de la empresa.
 * Componente compartido usado tanto en el módulo de Configuración del ERP (cliente)
 * como en el panel SuperAdmin (detalle de tenant).
 *
 *   - Sin tenantId → modo cliente: usa config.service + catalog.service + EmpresaContext
 *   - Con tenantId → modo admin:   usa superAdminSvc + límites editables
 */

import React, { useEffect, useRef, useState } from 'react';
import { Building2, Save, Upload, Settings } from 'lucide-react';
import { colors, radius } from '../../styles/colors';
import {
  getEmpresa, updateEmpresa, uploadEmpresaLogo as uploadLogoERP,
  type ConfigEmpresa,
} from '../../services/config.service';
import {
  getDepartamentos as getDptosERP, getMunicipios as getMpiosERP,
  type Departamento, type Municipio,
} from '../../services/catalog.service';
import { useEmpresa } from '../../context/EmpresaContext';
import { superAdminSvc, type TenantDetalle } from '../../superadmin/services/superadmin.service';
import { notify } from '../../utils/notify';

// ── Estilos ───────────────────────────────────────────────────────────────────

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
const fieldS: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Form = Omit<ConfigEmpresa, 'id' | 'updated_at' | 'logo_url' | 'departamento_id' | 'municipio_id'>;

const EMPTY_FORM: Form = {
  nombre_negocio: '', nit: '', ncr: '', direccion: '',
  giro: '', departamento: '', municipio: '', telefono: '', correo: '',
  cod_actividad: '', desc_actividad: '', tipo_establecimiento: '',
};

interface LimitEditor {
  show:   boolean;
  input:  string;
  saving: boolean;
}
const LIMIT_INIT: LimitEditor = { show: false, input: '', saving: false };

export interface Props {
  tenantId?:        number;
  tenant?:          TenantDetalle | null;
  onTenantUpdated?: (t: TenantDetalle) => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function EmpresaSection({ tenantId, tenant, onTenantUpdated }: Props) {
  const isAdmin = tenantId !== undefined;
  const { reload } = useEmpresa();

  const [form,          setForm]          = useState<Form>(EMPTY_FORM);
  const [logoUrl,       setLogoUrl]       = useState<string | null>(null);
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios,    setMunicipios]    = useState<Municipio[]>([]);

  // Editores de límites (solo modo admin)
  const [sucEditor, setSucEditor] = useState<LimitEditor>(LIMIT_INIT);
  const [pvEditor,  setPvEditor]  = useState<LimitEditor>(LIMIT_INIT);
  const [usrEditor, setUsrEditor] = useState<LimitEditor>(LIMIT_INIT);

  // ── Carga inicial ────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadEmpresa = isAdmin
      ? superAdminSvc.getEmpresaConfig(tenantId!)
      : getEmpresa();
    const loadDptos = isAdmin
      ? superAdminSvc.getDepartamentos()
      : getDptosERP();

    Promise.all([loadEmpresa as Promise<ConfigEmpresa>, loadDptos])
      .then(([e, dpts]) => {
        setDepartamentos(dpts);
        setForm({
          nombre_negocio:      e.nombre_negocio      ?? '',
          nit:                 e.nit                 ?? '',
          ncr:                 e.ncr                 ?? '',
          direccion:           e.direccion           ?? '',
          giro:                e.giro                ?? '',
          departamento:        e.departamento        ?? '',
          municipio:           e.municipio           ?? '',
          telefono:            e.telefono            ?? '',
          correo:              e.correo              ?? '',
          cod_actividad:       e.cod_actividad       ?? '',
          desc_actividad:      e.desc_actividad      ?? '',
          tipo_establecimiento:e.tipo_establecimiento ?? '',
        });
        setLogoUrl(e.logo_url ?? null);

        const dptoId = e.departamento_id || dpts.find(d => d.nombre === e.departamento)?.id;
        if (dptoId) {
          const loadMpios = isAdmin ? superAdminSvc.getMunicipios(dptoId) : getMpiosERP(dptoId);
          loadMpios.then(ms => setMunicipios(ms as Municipio[])).catch(console.error);
        }
      })
      .catch(() => notify.error('No se pudo cargar la información de la empresa'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tenantId]);

  // ── Helpers form ─────────────────────────────────────────────────────────────

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleChangeDpto = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val  = e.target.value;
    const dpto = departamentos.find(d => String(d.id) === val || d.nombre === val);
    if (dpto) {
      setForm(f => ({ ...f, departamento: dpto.nombre, municipio: '' }));
      const loadMpios = isAdmin ? superAdminSvc.getMunicipios(dpto.id) : getMpiosERP(dpto.id);
      loadMpios.then(ms => setMunicipios(ms as Municipio[])).catch(console.error);
    } else {
      setForm(f => ({ ...f, departamento: '', municipio: '' }));
      setMunicipios([]);
    }
  };

  const handleChangeMpio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mpio = municipios.find(m => String(m.id) === e.target.value || m.nombre === e.target.value);
    setForm(f => ({ ...f, municipio: mpio?.nombre ?? '' }));
  };

  // ── Upload logo ──────────────────────────────────────────────────────────────

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      let updated: ConfigEmpresa;
      if (isAdmin) {
        updated = await superAdminSvc.uploadEmpresaLogo(tenantId!, file) as ConfigEmpresa;
      } else {
        updated = await uploadLogoERP(file);
        await reload();
      }
      setLogoUrl(updated.logo_url ?? null);
      setLogoPreview(null);
      notify.success('Logo actualizado');
    } catch (err: any) {
      notify.error('Error al subir el logo', err.message);
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Guardar empresa ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.nombre_negocio.trim()) { notify.error('El nombre del negocio es requerido'); return; }
    setSaving(true);
    try {
      const dptoMatch = departamentos.find(d => d.nombre === form.departamento);
      const mpioMatch = municipios.find(m => m.nombre === form.municipio);
      const payload   = {
        ...form,
        departamento_id: dptoMatch?.id ?? null,
        municipio_id:    mpioMatch?.id ?? null,
      };
      if (isAdmin) {
        await superAdminSvc.updateEmpresaConfig(tenantId!, payload);
      } else {
        await updateEmpresa(payload);
        await reload();
      }
      notify.success('Información guardada correctamente');
    } catch (err: any) {
      notify.error('Error al guardar', err.message);
    } finally { setSaving(false); }
  };

  // ── Guardar límite ───────────────────────────────────────────────────────────

  const saveLimit = async (
    field:     'max_sucursales' | 'max_puntos_venta' | 'max_usuarios',
    input:     string,
    setEditor: React.Dispatch<React.SetStateAction<LimitEditor>>,
  ) => {
    const newOverride = input.trim() === '' ? null : parseInt(input, 10);
    if (newOverride !== null && (isNaN(newOverride) || newOverride < 1)) {
      notify.error('Ingresa un número válido mayor a 0'); return;
    }
    setEditor(s => ({ ...s, saving: true }));
    try {
      const updated = await superAdminSvc.updateTenant(tenantId!, { [field]: newOverride });
      onTenantUpdated?.(updated);
      setEditor(LIMIT_INIT);
      notify.success(
        newOverride === null
          ? 'Límite restablecido al del plan'
          : `Límite actualizado a ${newOverride}`,
      );
    } catch (e: any) {
      notify.error('Error al guardar límite', e.message);
      setEditor(s => ({ ...s, saving: false }));
    }
  };

  const openEditor = (
    which: 'suc' | 'pv' | 'usr',
    currentOverride: number | null,
  ) => {
    const input = currentOverride != null ? String(currentOverride) : '';
    setSucEditor(s => which === 'suc' ? { show: true,  input, saving: false } : { ...s, show: false });
    setPvEditor (s => which === 'pv'  ? { show: true,  input, saving: false } : { ...s, show: false });
    setUsrEditor(s => which === 'usr' ? { show: true,  input, saving: false } : { ...s, show: false });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>
  );

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Building2 size={18} color={colors.textSecondary} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
          Información de la Empresa
        </h2>
      </div>

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px',
        background: colors.pageBg, borderRadius: radius.md,
        border: `1px solid ${colors.border}`, marginBottom: 24,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: radius.md,
          border: `1px solid ${colors.border}`, background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {(logoPreview || logoUrl) ? (
            <img src={logoPreview ?? logoUrl!} alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 11, color: colors.textMuted }}>Sin logo</span>
          )}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, margin: '0 0 4px' }}>
            Logo de la empresa
          </p>
          <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 10px' }}>
            JPG, PNG, SVG o WebP · Máx. 2 MB
          </p>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.svg,.webp"
            style={{ display: 'none' }} onChange={handleLogoChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingLogo}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              background: uploadingLogo ? '#c8c8c8' : colors.accent,
              color: colors.accentText, border: 'none', borderRadius: radius.sm,
              fontSize: 12, fontWeight: 600,
              cursor: uploadingLogo ? 'not-allowed' : 'pointer',
            }}
          >
            <Upload size={13} />
            {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
          </button>
        </div>
      </div>

      {/* ── Campos ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
        <div style={{ ...fieldS, gridColumn: '1 / -1' }}>
          <label style={labelS}>Nombre del negocio *</label>
          <input style={inputS} value={form.nombre_negocio} onChange={set('nombre_negocio')}
            placeholder="Ej. Farma Express S.A. de C.V." />
        </div>

        <div style={fieldS}>
          <label style={labelS}>NIT</label>
          <input style={inputS} value={form.nit ?? ''} onChange={set('nit')} placeholder="0000-000000-000-0" />
        </div>
        <div style={fieldS}>
          <label style={labelS}>NCR</label>
          <input style={inputS} value={form.ncr ?? ''} onChange={set('ncr')} placeholder="123456-7" />
        </div>

        <div style={{ ...fieldS, gridColumn: '1 / -1' }}>
          <label style={labelS}>Giro / Actividad económica</label>
          <input style={inputS} value={form.giro ?? ''} onChange={set('giro')}
            placeholder="Ej. Venta de productos farmacéuticos" />
        </div>

        <div style={{ ...fieldS, gridColumn: '1 / -1' }}>
          <label style={labelS}>Dirección</label>
          <textarea style={{ ...inputS, resize: 'vertical', minHeight: 70 }}
            value={form.direccion ?? ''} onChange={set('direccion')}
            placeholder="Calle, colonia, número..." />
        </div>

        <div style={fieldS}>
          <label style={labelS}>Departamento</label>
          <select style={inputS} value={form.departamento ?? ''} onChange={handleChangeDpto}>
            <option value="">[Seleccione un Departamento]</option>
            {departamentos.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
          </select>
        </div>
        <div style={fieldS}>
          <label style={labelS}>Municipio</label>
          <select style={inputS} value={form.municipio ?? ''} onChange={handleChangeMpio}
            disabled={!form.departamento}>
            <option value="">[Seleccione un Municipio]</option>
            {municipios.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          </select>
        </div>

        <div style={fieldS}>
          <label style={labelS}>Teléfono</label>
          <input style={inputS} value={form.telefono ?? ''} onChange={set('telefono')} placeholder="2222-3333" />
        </div>
        <div style={fieldS}>
          <label style={labelS}>Correo electrónico</label>
          <input style={inputS} type="email" value={form.correo ?? ''} onChange={set('correo')}
            placeholder="info@empresa.com" />
        </div>

        {/* DTE */}
        <div style={{ ...fieldS, gridColumn: '1 / -1', marginTop: 8 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: colors.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: 14, paddingBottom: 6, borderBottom: `1px solid ${colors.borderLight}`,
          }}>
            Datos para Facturación Electrónica (DTE)
          </div>
        </div>

        <div style={fieldS}>
          <label style={labelS}>Código de actividad económica</label>
          <input style={inputS} value={form.cod_actividad ?? ''} onChange={set('cod_actividad')}
            placeholder="Ej: 4711" />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
            Código CAT-019 del Ministerio de Hacienda
          </div>
        </div>
        <div style={fieldS}>
          <label style={labelS}>Tipo de establecimiento</label>
          <input style={inputS} value={form.tipo_establecimiento ?? ''} onChange={set('tipo_establecimiento')}
            placeholder="Ej: 02" />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
            Código CAT-009 (02 = establecimiento)
          </div>
        </div>

        <div style={{ ...fieldS, gridColumn: '1 / -1' }}>
          <label style={labelS}>Descripción de actividad económica</label>
          <input style={inputS} value={form.desc_actividad ?? ''} onChange={set('desc_actividad')}
            placeholder="Ej: Venta al por menor en comercios no especializados" />
        </div>
      </div>

      {/* ── Botón guardar ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px',
            background: saving ? '#c8c8c8' : colors.accent,
            color: colors.accentText, border: 'none',
            borderRadius: radius.md, fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* ── Límites del tenant (solo admin) ───────────────────────────────── */}
      {isAdmin && tenant && (
        <div style={{ marginTop: 32, borderTop: `1px solid ${colors.border}`, paddingTop: 24 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: colors.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16,
          }}>
            Límites del tenant
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Sucursales */}
            <LimitCard
              label="Sucursales"
              effective={tenant.max_sucursales}
              override={tenant.max_sucursales_override}
              planDefault={tenant.plan_max_sucursales}
              editor={sucEditor}
              onOpen={() => openEditor('suc', tenant.max_sucursales_override)}
              onClose={() => setSucEditor(LIMIT_INIT)}
              onInputChange={v => setSucEditor(s => ({ ...s, input: v }))}
              onSave={() => saveLimit('max_sucursales', sucEditor.input, setSucEditor)}
              onClear={() => { setSucEditor(s => ({ ...s, input: '' })); saveLimit('max_sucursales', '', setSucEditor); }}
            />
            {/* Puntos de Venta */}
            <LimitCard
              label="Puntos de Venta"
              effective={tenant.max_puntos_venta}
              override={tenant.max_puntos_venta_override}
              planDefault={tenant.plan_max_puntos_venta}
              editor={pvEditor}
              onOpen={() => openEditor('pv', tenant.max_puntos_venta_override)}
              onClose={() => setPvEditor(LIMIT_INIT)}
              onInputChange={v => setPvEditor(s => ({ ...s, input: v }))}
              onSave={() => saveLimit('max_puntos_venta', pvEditor.input, setPvEditor)}
              onClear={() => { setPvEditor(s => ({ ...s, input: '' })); saveLimit('max_puntos_venta', '', setPvEditor); }}
            />
            {/* Usuarios */}
            <LimitCard
              label="Usuarios"
              effective={tenant.max_usuarios}
              override={tenant.max_usuarios_override}
              planDefault={tenant.plan_max_usuarios}
              editor={usrEditor}
              onOpen={() => openEditor('usr', tenant.max_usuarios_override)}
              onClose={() => setUsrEditor(LIMIT_INIT)}
              onInputChange={v => setUsrEditor(s => ({ ...s, input: v }))}
              onSave={() => saveLimit('max_usuarios', usrEditor.input, setUsrEditor)}
              onClear={() => { setUsrEditor(s => ({ ...s, input: '' })); saveLimit('max_usuarios', '', setUsrEditor); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── LimitCard ─────────────────────────────────────────────────────────────────

interface LimitCardProps {
  label:        string;
  effective:    number | null;
  override:     number | null;
  planDefault:  number | null;
  editor:       LimitEditor;
  onOpen:       () => void;
  onClose:      () => void;
  onInputChange:(v: string) => void;
  onSave:       () => void;
  onClear:      () => void;
}

function LimitCard({
  label, effective, override, planDefault,
  editor, onOpen, onClose, onInputChange, onSave, onClear,
}: LimitCardProps) {
  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: colors.pageBg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: colors.textPrimary }}>{label}</span>
          <span style={{
            fontSize: 12, color: colors.textSecondary,
            background: colors.mutedBg, borderRadius: 4, padding: '2px 8px',
          }}>
            {effective !== null ? `máx. ${effective}` : 'Sin límite'}
          </span>
          {override !== null && (
            <span style={{ fontSize: 11, color: colors.accent, fontStyle: 'italic' }}>
              (override)
            </span>
          )}
        </div>
        <button
          onClick={editor.show ? onClose : onOpen}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'none', border: `1px solid ${colors.border}`,
            borderRadius: radius.sm, padding: '4px 10px',
            fontSize: 12, color: colors.textSecondary, cursor: 'pointer',
          }}
        >
          <Settings size={12} />
          {editor.show ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {/* Info row */}
      <div style={{ padding: '6px 16px 8px', fontSize: 12, color: colors.textMuted }}>
        Plan incluye: <strong>{planDefault !== null ? planDefault : '—'}</strong>
        {override !== null && (
          <span> · Override activo: <strong>{override}</strong></span>
        )}
      </div>

      {/* Editor */}
      {editor.show && (
        <div style={{
          padding: '12px 16px', borderTop: `1px solid ${colors.borderLight}`,
          background: colors.cardBg, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <input
            type="number" min={1}
            placeholder={`Dejar vacío = usar plan (${planDefault ?? '∞'})`}
            value={editor.input}
            onChange={e => onInputChange(e.target.value)}
            style={{ ...inputS, width: 200 }}
          />
          <button
            onClick={onSave}
            disabled={editor.saving}
            style={{
              background: editor.saving ? '#c8c8c8' : colors.accent,
              color: colors.accentText, border: 'none',
              borderRadius: radius.sm, padding: '8px 16px',
              fontSize: 12, fontWeight: 600,
              cursor: editor.saving ? 'not-allowed' : 'pointer',
            }}
          >
            {editor.saving ? 'Guardando...' : 'Guardar'}
          </button>
          {override !== null && (
            <button
              onClick={onClear}
              disabled={editor.saving}
              style={{
                background: 'none', color: '#dc2626',
                border: '1px solid #dc2626', borderRadius: radius.sm,
                padding: '8px 14px', fontSize: 12, fontWeight: 600,
                cursor: editor.saving ? 'not-allowed' : 'pointer',
              }}
            >
              Quitar override
            </button>
          )}
        </div>
      )}
    </div>
  );
}
