/**
 * GenericForm.tsx — Modal de formulario reutilizable para cualquier entidad.
 * Soporta campos de tipo file (imágenes). Cuando hay al menos un campo file
 * el onSubmit recibe un Record<string, unknown> donde los campos file son File|null.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import type { FieldConfig, FieldOption } from './types';

const FORM_STYLES = `
  @keyframes modal-in {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .form-input {
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .form-input:focus {
    border-color: rgba(0,0,0,0.45) !important;
    box-shadow: 0 0 0 3px rgba(0,0,0,0.07) !important;
    background: #ffffff !important;
    outline: none;
  }
  .form-input:hover:not(:focus) {
    border-color: #c4c4c4 !important;
  }
  .btn-cancel:hover {
    background: #f4f4f6 !important;
    border-color: #c4c4c4 !important;
  }
  .btn-submit:hover:not(:disabled) {
    opacity: 0.88 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.22) !important;
  }
  .btn-close:hover {
    background: #f0f0f4 !important;
    border-color: #c4c4c4 !important;
  }
  .file-drop:hover {
    border-color: rgba(0,0,0,0.4) !important;
    background: #f9f9fb !important;
  }
  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
`;

interface Props {
  title:         string;
  submitLabel:   string;
  fields:        FieldConfig[];
  defaultValues: Record<string, unknown>;
  onSubmit:      (data: Record<string, unknown>) => Promise<void>;
  onClose:       () => void;
  loading:       boolean;
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: `1.5px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: '14px',
  color: colors.textPrimary,
  background: colors.inputBg,
  boxSizing: 'border-box',
  outline: 'none',
};

const GenericForm: React.FC<Props> = ({
  title, submitLabel, fields,
  defaultValues, onSubmit, onClose, loading,
}) => {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Record<string, unknown>>({
    defaultValues,
  });

  // ── Opciones asíncronas y en cascada ────────────────────────────────────────
  const [asyncOpts,   setAsyncOpts]   = useState<Record<string, FieldOption[]>>({});
  const isFirstMount = useRef(true);

  // Recoger qué campos tienen dependientes (para watch selectivo)
  const depFieldNames = fields.filter(f => f.dependsOn).map(f => f.dependsOn!);
  const uniqueDepNames = [...new Set(depFieldNames)];
  const watchedDepVals  = watch(uniqueDepNames);
  const depValsKey      = JSON.stringify(watchedDepVals);

  // Cargar opciones estáticas asíncronas al montar
  useEffect(() => {
    fields.forEach(field => {
      if (field.loadOptions) {
        field.loadOptions().then(opts =>
          setAsyncOpts(prev => ({ ...prev, [field.name]: opts }))
        );
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recargar opciones en cascada cuando cambia el campo dependiente
  useEffect(() => {
    uniqueDepNames.forEach((depName, idx) => {
      const depVal = String(watchedDepVals[idx] ?? '');
      fields.filter(f => f.dependsOn === depName && f.loadOptionsByDep).forEach(field => {
        if (depVal) {
          field.loadOptionsByDep!(depVal).then(opts =>
            setAsyncOpts(prev => ({ ...prev, [field.name]: opts }))
          );
          // Resetear el campo dependiente solo cuando el usuario cambia el padre (no al montar)
          if (!isFirstMount.current) {
            setValue(field.name, '');
          }
        } else {
          setAsyncOpts(prev => ({ ...prev, [field.name]: [] }));
          if (!isFirstMount.current) setValue(field.name, '');
        }
      });
    });
    isFirstMount.current = false;
  }, [depValsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estado para preview de archivos seleccionados
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [fileNames,    setFileNames]    = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileNames(prev  => ({ ...prev, [fieldName]: file.name }));
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      const url = URL.createObjectURL(file);
      setFilePreviews(prev => ({ ...prev, [fieldName]: url }));
    } else {
      setFilePreviews(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
    }
  };

  // Interceptar submit para adjuntar los File objects
  const handleFormSubmit = (data: Record<string, unknown>) => {
    const result = { ...data };
    fields.forEach(f => {
      if (f.type === 'file') {
        const input = fileRefs.current[f.name];
        result[f.name] = input?.files?.[0] ?? null;
      }
    });
    return onSubmit(result);
  };

  return (
    <>
      <style>{FORM_STYLES}</style>

      {/* Overlay con blur */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,10,20,0.5)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal */}
        <div style={{
          background: colors.cardBg,
          borderRadius: radius.xl,
          width: '100%', maxWidth: '540px',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.05)',
          animation: 'modal-in 0.2s ease-out',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Barra de color superior */}
          <div style={{
            height: '4px',
            borderRadius: `${radius.xl} ${radius.xl} 0 0`,
            background: colors.accent,
            flexShrink: 0,
          }} />

          {/* Encabezado */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 18px',
            borderBottom: `1px solid ${colors.borderLight}`,
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: colors.textPrimary, margin: 0, letterSpacing: '-0.2px' }}>
                {title}
              </h2>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: '3px 0 0' }}>
                Los campos marcados con <span style={{ color: colors.danger }}>*</span> son obligatorios
              </p>
            </div>
            <button
              className="btn-close"
              onClick={onClose}
              style={{
                width: '34px', height: '34px',
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                background: colors.cardBg,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <X size={15} color={colors.textSecondary} />
            </button>
          </div>

          {/* Campos */}
          <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{
              padding: '20px 24px',
              display: 'flex', flexDirection: 'column', gap: '14px',
              overflowY: 'auto',
            }}>
              {fields.map((field) => (
                <div key={field.name}>

                  {/* Label */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: 600,
                    color: colors.textSecondary, marginBottom: '6px',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                  }}>
                    {field.label}
                    {field.required && (
                      <span style={{ color: colors.danger, fontSize: '14px', lineHeight: 1 }}>*</span>
                    )}
                  </label>

                  {/* Select */}
                  {field.type === 'select' && (() => {
                    const isAsync = !!(field.loadOptions || field.dependsOn);
                    const opts    = asyncOpts[field.name] ?? field.options ?? [];
                    const isLoading = isAsync && opts.length === 0;
                    return (
                      <select
                        className="form-input"
                        style={{
                          ...inputBase,
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239b9b9b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: '36px',
                        }}
                        {...register(field.name, {
                          required: field.required ? `${field.label} es requerido` : false,
                        })}
                      >
                        {isAsync && (
                          <option value="">
                            {isLoading ? '— Cargando... —' : '— Seleccionar —'}
                          </option>
                        )}
                        {opts.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    );
                  })()}

                  {/* Textarea */}
                  {field.type === 'textarea' && (
                    <textarea
                      className="form-input"
                      placeholder={field.placeholder}
                      style={{ ...inputBase, resize: 'vertical', minHeight: '84px', lineHeight: '1.5' }}
                      {...register(field.name)}
                    />
                  )}

                  {/* Text / Email / Tel / Number */}
                  {(field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'number') && (
                    <input
                      className="form-input"
                      type={field.type}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      style={inputBase}
                      {...register(field.name, {
                        required:  field.required ? `${field.label} es requerido` : false,
                        maxLength: field.maxLength
                          ? { value: field.maxLength, message: `Máximo ${field.maxLength} caracteres` }
                          : undefined,
                      })}
                    />
                  )}

                  {/* File */}
                  {field.type === 'file' && (
                    <div>
                      {/* Input oculto */}
                      <input
                        type="file"
                        accept={field.accept}
                        style={{ display: 'none' }}
                        ref={(el) => { fileRefs.current[field.name] = el; }}
                        onChange={(e) => handleFileChange(field.name, e)}
                      />
                      {/* Zona de clic */}
                      <div
                        className="file-drop"
                        onClick={() => fileRefs.current[field.name]?.click()}
                        style={{
                          border: `1.5px dashed ${colors.border}`,
                          borderRadius: radius.md,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: colors.inputBg,
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        {/* Preview o ícono */}
                        {filePreviews[field.name] ? (
                          <img
                            src={filePreviews[field.name]}
                            alt="preview"
                            style={{
                              width: '48px', height: '48px',
                              objectFit: 'cover',
                              borderRadius: radius.sm,
                              flexShrink: 0,
                              border: `1px solid ${colors.border}`,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '48px', height: '48px',
                            background: '#f0f0f4',
                            borderRadius: radius.sm,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <ImageIcon size={20} color={colors.textMuted} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary, margin: 0, marginBottom: '2px' }}>
                            {fileNames[field.name] || 'Seleccionar imagen'}
                          </p>
                          <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>
                            {field.accept
                              ? `Formatos: ${field.accept.replace(/image\//g, '').toUpperCase()}`
                              : 'JPG, PNG, SVG'} · Máx 5 MB
                          </p>
                        </div>
                        <Upload size={16} color={colors.textMuted} style={{ flexShrink: 0 }} />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {errors[field.name] && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      marginTop: '5px',
                    }}>
                      <AlertCircle size={12} color={colors.danger} />
                      <p style={{ fontSize: '12px', color: colors.danger, margin: 0 }}>
                        {errors[field.name]?.message as string}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pie */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${colors.borderLight}`,
              display: 'flex', gap: '10px', justifyContent: 'flex-end',
              flexShrink: 0,
              background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
            }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: `1.5px solid ${colors.border}`,
                  borderRadius: radius.md,
                  background: colors.cardBg,
                  fontSize: '14px', fontWeight: 600,
                  color: colors.textSecondary, cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: radius.md,
                  background: colors.accent,
                  fontSize: '14px', fontWeight: 600,
                  color: colors.accentText, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                  minWidth: '120px', justifyContent: 'center',
                }}
              >
                {loading && <span className="spinner" />}
                {loading ? 'Guardando...' : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default GenericForm;
