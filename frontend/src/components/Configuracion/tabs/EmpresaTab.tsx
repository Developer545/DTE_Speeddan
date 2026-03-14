/**
 * EmpresaTab.tsx — Información de la empresa.
 * Campos: nombre_negocio, NIT, NCR, dirección, giro, departamento,
 *         municipio, teléfono, correo.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Building2, Save, Upload, X } from 'lucide-react';
import { colors, radius, shadow } from '../../../styles/colors';
import { getEmpresa, updateEmpresa, uploadEmpresaLogo, type ConfigEmpresa } from '../../../services/config.service';
import { getDepartamentos, getMunicipios, type Departamento, type Municipio } from '../../../services/catalog.service';
import { useEmpresa } from '../../../context/EmpresaContext';
import { notify } from '../../../utils/notify';

// ── Helpers de estilo ─────────────────────────────────────────────────────────

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

// ── Componente ────────────────────────────────────────────────────────────────

type Form = Omit<ConfigEmpresa, 'id' | 'updated_at' | 'logo_url' | 'departamento_id' | 'municipio_id'>;

const EMPTY: Form = {
  nombre_negocio: '', nit: '', ncr: '', direccion: '',
  giro: '', departamento: '', municipio: '', telefono: '', correo: '',
  cod_actividad: '', desc_actividad: '', tipo_establecimiento: '',
};

export function EmpresaTab() {
  const { reload } = useEmpresa();
  const [form, setForm] = useState<Form>(EMPTY);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  // 1. Cargar config empresa y departamentos base
  useEffect(() => {
    Promise.all([
      getEmpresa(),
      getDepartamentos()
    ])
      .then(([e, dpts]) => {
        setDepartamentos(dpts);
        setForm({
          nombre_negocio: e.nombre_negocio ?? '',
          nit: e.nit ?? '',
          ncr: e.ncr ?? '',
          direccion: e.direccion ?? '',
          giro: e.giro ?? '',
          departamento: e.departamento ?? '',
          municipio: e.municipio ?? '',
          telefono: e.telefono ?? '',
          correo: e.correo ?? '',
          cod_actividad: e.cod_actividad ?? '',
          desc_actividad: e.desc_actividad ?? '',
          tipo_establecimiento: e.tipo_establecimiento ?? '',
        });
        setLogoUrl(e.logo_url ?? null);

        // Si la empresa ya tiene departamento_id (o nombre que haga match), cargar municipios correspondientes
        const dptoId = e.departamento_id || dpts.find(d => d.nombre === e.departamento)?.id;
        if (dptoId) {
          getMunicipios(dptoId).then(setMunicipios).catch(console.error);
        }
      }).catch(() => notify.error('No se pudo cargar la información de la empresa'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview local
    setLogoPreview(URL.createObjectURL(file));
    // Upload
    setUploadingLogo(true);
    try {
      const updated = await uploadEmpresaLogo(file);
      setLogoUrl(updated.logo_url ?? null);
      setLogoPreview(null);
      await reload();
      notify.success('Logo actualizado');
    } catch (err: any) {
      notify.error('Error al subir el logo', err.response?.data?.message);
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleChangeDpto = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const dpto = departamentos.find(d => String(d.id) === val || d.nombre === val);

    if (dpto) {
      setForm(f => ({ ...f, departamento: dpto.nombre, municipio: '' }));
      getMunicipios(dpto.id).then(setMunicipios).catch(console.error);
    } else {
      setForm(f => ({ ...f, departamento: '', municipio: '' }));
      setMunicipios([]);
    }
  };

  const handleChangeMpio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const mpio = municipios.find(m => String(m.id) === val || m.nombre === val);
    if (mpio) {
      setForm(f => ({ ...f, municipio: mpio.nombre }));
    } else {
      setForm(f => ({ ...f, municipio: '' }));
    }
  };

  const handleSave = async () => {
    if (!form.nombre_negocio.trim()) { notify.error('El nombre del negocio es requerido'); return; }
    setSaving(true);
    try {
      // Find IDs if available based on names to construct update correctly.
      const dptoMatch = departamentos.find(d => d.nombre === form.departamento);
      const mpioMatch = municipios.find(m => m.nombre === form.municipio);

      await updateEmpresa({
        ...form,
        departamento_id: dptoMatch?.id || null,
        municipio_id: mpioMatch?.id || null,
      });
      await reload();
      notify.success('Información guardada correctamente');
    } catch (err: any) {
      notify.error('Error al guardar', err.response?.data?.message);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Building2 size={18} color={colors.textSecondary} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
          Información de la Empresa
        </h2>
      </div>

      {/* Logo de la empresa */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '16px 20px',
        background: colors.pageBg,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        marginBottom: 24,
      }}>
        {/* Vista previa */}
        <div style={{
          width: 72, height: 72, borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
          background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {(logoPreview || logoUrl) ? (
            <img
              src={logoPreview ?? logoUrl!}
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.svg,.webp"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingLogo}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              background: uploadingLogo ? '#c8c8c8' : colors.accent,
              color: colors.accentText,
              border: 'none', borderRadius: radius.sm,
              fontSize: 12, fontWeight: 600,
              cursor: uploadingLogo ? 'not-allowed' : 'pointer',
            }}
          >
            <Upload size={13} />
            {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
        {/* Nombre negocio — ocupa las 2 columnas */}
        <div style={{ ...fieldS, gridColumn: '1 / -1' }}>
          <label style={labelS}>Nombre del negocio *</label>
          <input style={inputS} value={form.nombre_negocio} onChange={set('nombre_negocio')} placeholder="Ej. Farma Express S.A. de C.V." />
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
          <input style={inputS} value={form.giro ?? ''} onChange={set('giro')} placeholder="Ej. Venta de productos farmacéuticos" />
        </div>

        <div style={{ ...fieldS, gridColumn: '1 / -1' }}>
          <label style={labelS}>Dirección</label>
          <textarea
            style={{ ...inputS, resize: 'vertical', minHeight: 70 }}
            value={form.direccion ?? ''} onChange={set('direccion')}
            placeholder="Calle, colonia, número..."
          />
        </div>

        <div style={fieldS}>
          <label style={labelS}>Departamento</label>
          <select style={inputS} value={form.departamento ?? ''} onChange={handleChangeDpto}>
            <option value="">[Seleccione un Departamento]</option>
            {departamentos.map(d => (
              <option key={d.id} value={d.nombre}>{d.nombre}</option>
            ))}
          </select>
        </div>
        <div style={fieldS}>
          <label style={labelS}>Municipio</label>
          <select style={inputS} value={form.municipio ?? ''} onChange={handleChangeMpio} disabled={!form.departamento}>
            <option value="">[Seleccione un Municipio]</option>
            {municipios.map(m => (
              <option key={m.id} value={m.nombre}>{m.nombre}</option>
            ))}
          </select>
        </div>

        <div style={fieldS}>
          <label style={labelS}>Teléfono</label>
          <input style={inputS} value={form.telefono ?? ''} onChange={set('telefono')} placeholder="2222-3333" />
        </div>
        <div style={fieldS}>
          <label style={labelS}>Correo electrónico</label>
          <input style={inputS} type="email" value={form.correo ?? ''} onChange={set('correo')} placeholder="info@empresa.com" />
        </div>

        {/* ── Campos DTE (Hacienda) ── */}
        <div style={{ ...fieldS, gridColumn: '1 / -1', marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14, paddingBottom: 6, borderBottom: `1px solid ${colors.borderLight}` }}>
            Datos para Facturación Electrónica (DTE)
          </div>
        </div>

        <div style={fieldS}>
          <label style={labelS}>Código de actividad económica</label>
          <input style={inputS} value={form.cod_actividad ?? ''} onChange={set('cod_actividad')} placeholder="Ej: 4711" />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>Código CAT-019 del Ministerio de Hacienda</div>
        </div>
        <div style={fieldS}>
          <label style={labelS}>Tipo de establecimiento</label>
          <input style={inputS} value={form.tipo_establecimiento ?? ''} onChange={set('tipo_establecimiento')} placeholder="Ej: 02" />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>Código CAT-009 (02 = establecimiento)</div>
        </div>

        <div style={{ ...fieldS, gridColumn: '1 / -1' }}>
          <label style={labelS}>Descripción de actividad económica</label>
          <input style={inputS} value={form.desc_actividad ?? ''} onChange={set('desc_actividad')} placeholder="Ej: Venta al por menor en comercios no especializados" />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
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
    </div>
  );
}
