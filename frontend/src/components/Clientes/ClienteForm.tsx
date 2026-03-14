/**
 * ClienteForm.tsx — Formulario personalizado para crear/editar Clientes.
 *
 * Reemplaza al GenericForm genérico para mostrar campos condicionales según tipo_cliente:
 *
 *   PERSONA NATURAL:
 *     - Tipo doc: DUI (default) | Pasaporte | Carnet Residente | Otro
 *     - Número documento principal
 *     - NIT (campo separado, opcional — para personas que también tienen NIT)
 *
 *   EMPRESA:
 *     - Tipo doc: NIT (fijo)
 *     - NIT (número de la empresa) = numero_documento
 *     - NCR (Número de Registro de Contribuyente — para DTE_03)
 *     - Nombre Comercial (opcional)
 *     - Giro / Actividad Económica (opcional)
 *
 *   AMBOS:
 *     - Nombre completo / Razón social
 *     - Dirección, Teléfono, Correo
 *     - Departamento + Municipio (cascada)
 */

import React, { useState, useEffect } from 'react';
import { X, Building2, User, AlertCircle } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { getDepartamentos, getMunicipios } from '../../services/catalog.service';
import type { Departamento, Municipio } from '../../services/catalog.service';
import type { CustomFormProps } from '../Common';
import type { TipoDocumento, TipoCliente } from '../../types/cliente.types';

// ── Estilos ───────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes modal-in {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  .cf-input {
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cf-input:focus {
    border-color: rgba(0,0,0,0.45) !important;
    box-shadow: 0 0 0 3px rgba(0,0,0,0.07) !important;
    background: #ffffff !important;
    outline: none;
  }
  .cf-input:hover:not(:focus) { border-color: #c4c4c4 !important; }
  .btn-close-cf:hover { background: #f0f0f4 !important; }
  .btn-cancel-cf:hover { background: #f4f4f6 !important; border-color: #c4c4c4 !important; }
  .btn-submit-cf:hover:not(:disabled) { opacity: 0.88 !important; }
  .tipo-btn { transition: all 0.15s; }
  .tipo-btn:hover { opacity: 0.85 !important; }
`;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  fontSize: '13px',
  color: colors.textPrimary,
  background: colors.inputBg,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: colors.textSecondary,
  marginBottom: '5px',
  letterSpacing: '0.3px',
};

const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

// ── Opciones de tipo de documento por tipo de cliente ────────────────────────

const DOC_OPTIONS_NATURAL: { value: TipoDocumento; label: string }[] = [
  { value: 'DUI',              label: 'DUI (Documento Único de Identidad)' },
  { value: 'Pasaporte',        label: 'Pasaporte' },
  { value: 'Carnet Residente', label: 'Carnet de Residente (DIMEX)' },
  { value: 'Otro',             label: 'Otro' },
];

// Para empresa el tipo siempre es NIT (empresa se identifica por su NIT)
const DOC_OPTIONS_EMPRESA: { value: TipoDocumento; label: string }[] = [
  { value: 'NIT', label: 'NIT (Número de Identificación Tributaria)' },
];

// ── Campos iniciales del formulario ──────────────────────────────────────────

interface FormValues {
  tipo_cliente:      TipoCliente;
  nombre_completo:   string;
  tipo_documento:    TipoDocumento;
  numero_documento:  string;
  nit:               string;     // separado de numero_documento para persona_natural
  ncr:               string;     // solo empresa
  nombre_comercial:  string;     // solo empresa
  giro:              string;     // solo empresa
  direccion:         string;
  telefono:          string;
  correo:            string;
  departamento_id:   string;
  municipio_id:      string;
}

function toInitial(defaults: Record<string, unknown>): FormValues {
  return {
    tipo_cliente:     (defaults.tipo_cliente as TipoCliente) || 'persona_natural',
    nombre_completo:  (defaults.nombre_completo as string)   || '',
    tipo_documento:   (defaults.tipo_documento as TipoDocumento) || 'DUI',
    numero_documento: (defaults.numero_documento as string)  || '',
    nit:              (defaults.nit as string)               || '',
    ncr:              (defaults.ncr as string)               || '',
    nombre_comercial: (defaults.nombre_comercial as string)  || '',
    giro:             (defaults.giro as string)              || '',
    direccion:        (defaults.direccion as string)         || '',
    telefono:         (defaults.telefono as string)          || '',
    correo:           (defaults.correo as string)            || '',
    departamento_id:  (defaults.departamento_id as string)   || '',
    municipio_id:     (defaults.municipio_id as string)      || '',
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ClienteForm({ title, submitLabel, defaultValues, onSubmit, onClose, loading }: CustomFormProps) {
  const [form, setForm] = useState<FormValues>(() => toInitial(defaultValues));
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios,    setMunicipios]    = useState<Municipio[]>([]);
  const [loadingMuns,   setLoadingMuns]   = useState(false);

  // ── Cargar departamentos al montar ──────────────────────────────────────
  useEffect(() => {
    getDepartamentos().then(setDepartamentos).catch(() => {});
  }, []);

  // ── Cargar municipios cuando cambia el departamento ─────────────────────
  useEffect(() => {
    if (!form.departamento_id) { setMunicipios([]); return; }
    setLoadingMuns(true);
    getMunicipios(Number(form.departamento_id))
      .then(setMunicipios)
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMuns(false));
  }, [form.departamento_id]);

  // ── Ajustar tipo_documento al cambiar tipo_cliente ──────────────────────
  const handleTipoCliente = (tipo: TipoCliente) => {
    setForm(prev => ({
      ...prev,
      tipo_cliente:   tipo,
      // Empresa siempre usa NIT como tipo_documento
      tipo_documento: tipo === 'empresa' ? 'NIT' : 'DUI',
      // Limpiar campos específicos del tipo anterior
      ncr:           '',
      nombre_comercial: '',
      giro:          '',
      nit:           '',
    }));
  };

  const set = (field: keyof FormValues, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    // Al cambiar departamento, limpiar municipio
    if (field === 'departamento_id') setForm(prev => ({ ...prev, departamento_id: value, municipio_id: '' }));
  };

  // ── Validación ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormValues, string>> = {};

    if (!form.nombre_completo.trim()) errs.nombre_completo = 'Nombre requerido';
    if (!form.numero_documento.trim()) errs.numero_documento = 'Número de documento requerido';

    // Validar formato DUI: 8 dígitos, guión, 1 dígito
    if (form.tipo_documento === 'DUI' && !/^\d{8}-\d$/.test(form.numero_documento)) {
      errs.numero_documento = 'Formato DUI: 12345678-9';
    }

    if (form.correo && !/^[^@]+@[^@]+\.[^@]+$/.test(form.correo)) {
      errs.correo = 'Correo inválido';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Para empresa: numero_documento = NIT de la empresa
    // Para persona_natural: numero_documento = DUI/Pasaporte/etc., nit = campo separado
    onSubmit({
      tipo_cliente:      form.tipo_cliente,
      nombre_completo:   form.nombre_completo.trim(),
      tipo_documento:    form.tipo_documento,
      numero_documento:  form.numero_documento.trim(),
      nit:               form.nit.trim()             || undefined,
      ncr:               form.ncr.trim()             || undefined,
      nombre_comercial:  form.nombre_comercial.trim() || undefined,
      giro:              form.giro.trim()            || undefined,
      direccion:         form.direccion.trim()       || undefined,
      telefono:          form.telefono.trim()        || undefined,
      correo:            form.correo.trim()          || undefined,
      departamento_id:   form.departamento_id        ? Number(form.departamento_id) : null,
      municipio_id:      form.municipio_id           ? Number(form.municipio_id)    : null,
    });
  };

  const isEmpresa = form.tipo_cliente === 'empresa';
  const docOptions = isEmpresa ? DOC_OPTIONS_EMPRESA : DOC_OPTIONS_NATURAL;

  return (
    <>
      <style>{STYLES}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: colors.cardBg,
            borderRadius: radius.lg,
            boxShadow: shadow.modal,
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            animation: 'modal-in 0.18s ease-out',
            zIndex: 1001,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px 14px',
            borderBottom: `1px solid ${colors.border}`,
          }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: colors.textPrimary }}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="btn-close-cf"
              style={{
                background: 'transparent', border: `1px solid ${colors.border}`,
                borderRadius: radius.sm, padding: '5px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} color={colors.textSecondary} />
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>

            {/* SECCIÓN 1: Tipo de cliente */}
            <section style={{ marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Tipo de Cliente
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {([
                  { value: 'persona_natural', label: 'Persona Natural', Icon: User },
                  { value: 'empresa',         label: 'Empresa',         Icon: Building2 },
                ] as const).map(({ value, label, Icon }) => {
                  const active = form.tipo_cliente === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className="tipo-btn"
                      onClick={() => handleTipoCliente(value)}
                      style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                        padding: '10px 16px',
                        border: `2px solid ${active ? colors.accent : colors.border}`,
                        borderRadius: radius.md,
                        background: active ? `${colors.accent}10` : colors.inputBg,
                        color: active ? colors.accent : colors.textSecondary,
                        fontWeight: active ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SECCIÓN 2: Identificación */}
            <section style={{ marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '6px' }}>
                {isEmpresa ? 'Identificación Fiscal' : 'Documento de Identidad'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                {/* Tipo de documento */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    Tipo de Documento <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <select
                    className="cf-input"
                    value={form.tipo_documento}
                    onChange={e => set('tipo_documento', e.target.value)}
                    disabled={isEmpresa}  // empresa siempre NIT
                    style={{ ...inputStyle, background: isEmpresa ? colors.mutedBg : colors.inputBg }}
                  >
                    {docOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Número de documento */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    {isEmpresa ? 'NIT de la Empresa' : 'Número de Documento'} <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="cf-input"
                    value={form.numero_documento}
                    onChange={e => set('numero_documento', e.target.value)}
                    placeholder={isEmpresa ? 'Ej: 0614-XXXXXX-XXX-X' : form.tipo_documento === 'DUI' ? '12345678-9' : 'Número'}
                    style={{ ...inputStyle, borderColor: errors.numero_documento ? colors.danger : undefined }}
                  />
                  {errors.numero_documento && (
                    <span style={{ fontSize: '11px', color: colors.danger, marginTop: '3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={11} /> {errors.numero_documento}
                    </span>
                  )}
                </div>

                {/* NIT separado — solo para persona_natural (campo adicional) */}
                {!isEmpresa && (
                  <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>
                      NIT (si posee) <span style={{ color: colors.textMuted, fontWeight: 400 }}>— opcional, para emitir DTE con NIT</span>
                    </label>
                    <input
                      type="text"
                      className="cf-input"
                      value={form.nit}
                      onChange={e => set('nit', e.target.value)}
                      placeholder="Ej: 0614-XXXXXX-XXX-X"
                      style={inputStyle}
                    />
                  </div>
                )}

                {/* NCR — solo empresa */}
                {isEmpresa && (
                  <div style={fieldWrap}>
                    <label style={labelStyle}>
                      NRC <span style={{ color: colors.textMuted, fontWeight: 400 }}>— Nº Reg. Contribuyente (DTE_03)</span>
                    </label>
                    <input
                      type="text"
                      className="cf-input"
                      value={form.ncr}
                      onChange={e => set('ncr', e.target.value)}
                      placeholder="Ej: 123456-7"
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* SECCIÓN 3: Datos generales */}
            <section style={{ marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '6px' }}>
                {isEmpresa ? 'Datos de la Empresa' : 'Datos Personales'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>

                {/* Nombre completo / Razón social */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    {isEmpresa ? 'Razón Social' : 'Nombre Completo'} <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="cf-input"
                    value={form.nombre_completo}
                    onChange={e => set('nombre_completo', e.target.value)}
                    placeholder={isEmpresa ? 'Razón social según registro mercantil' : 'Ej: Juan Pérez García'}
                    style={{ ...inputStyle, borderColor: errors.nombre_completo ? colors.danger : undefined }}
                  />
                  {errors.nombre_completo && (
                    <span style={{ fontSize: '11px', color: colors.danger, marginTop: '3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={11} /> {errors.nombre_completo}
                    </span>
                  )}
                </div>

                {/* Campos exclusivos de empresa */}
                {isEmpresa && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={fieldWrap}>
                      <label style={labelStyle}>Nombre Comercial <span style={{ color: colors.textMuted, fontWeight: 400 }}>— opcional</span></label>
                      <input type="text" className="cf-input" value={form.nombre_comercial}
                        onChange={e => set('nombre_comercial', e.target.value)}
                        placeholder="Nombre con el que opera"
                        style={inputStyle} />
                    </div>
                    <div style={fieldWrap}>
                      <label style={labelStyle}>Giro / Actividad Económica <span style={{ color: colors.textMuted, fontWeight: 400 }}>— opcional</span></label>
                      <input type="text" className="cf-input" value={form.giro}
                        onChange={e => set('giro', e.target.value)}
                        placeholder="Ej: Venta de productos de consumo"
                        style={inputStyle} />
                    </div>
                  </div>
                )}

                {/* Teléfono + Correo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>Teléfono</label>
                    <input type="tel" className="cf-input" value={form.telefono}
                      onChange={e => set('telefono', e.target.value)}
                      placeholder="+503 2345-6789"
                      style={inputStyle} />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>Correo Electrónico</label>
                    <input type="email" className="cf-input" value={form.correo}
                      onChange={e => set('correo', e.target.value)}
                      placeholder="correo@ejemplo.com"
                      style={{ ...inputStyle, borderColor: errors.correo ? colors.danger : undefined }} />
                    {errors.correo && (
                      <span style={{ fontSize: '11px', color: colors.danger, marginTop: '3px' }}>
                        {errors.correo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 4: Ubicación */}
            <section style={{ marginBottom: '24px' }}>
              <p style={{ ...labelStyle, marginBottom: '12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '6px' }}>
                Ubicación
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                {/* Departamento */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>Departamento</label>
                  <select className="cf-input"
                    value={form.departamento_id}
                    onChange={e => set('departamento_id', e.target.value)}
                    style={inputStyle}>
                    <option value="">— Seleccionar —</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Municipio */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>Municipio</label>
                  <select className="cf-input"
                    value={form.municipio_id}
                    onChange={e => set('municipio_id', e.target.value)}
                    disabled={!form.departamento_id || loadingMuns}
                    style={{ ...inputStyle, background: !form.departamento_id ? colors.mutedBg : colors.inputBg }}>
                    <option value="">— Seleccionar —</option>
                    {municipios.map(m => (
                      <option key={m.id} value={String(m.id)}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Dirección */}
                <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Dirección</label>
                  <textarea
                    className="cf-input"
                    value={form.direccion}
                    onChange={e => set('direccion', e.target.value)}
                    placeholder="Calle, número, colonia, ciudad"
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </section>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-cancel-cf"
                disabled={loading}
                style={{
                  padding: '9px 20px', border: `1px solid ${colors.border}`,
                  borderRadius: radius.md, background: colors.cardBg,
                  color: colors.textPrimary, fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-submit-cf"
                disabled={loading}
                style={{
                  padding: '9px 24px',
                  background: loading ? colors.textMuted : colors.accent,
                  color: colors.accentText,
                  border: 'none', borderRadius: radius.md,
                  fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                {loading ? 'Guardando…' : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default ClienteForm;
