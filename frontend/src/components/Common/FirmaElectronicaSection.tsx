/**
 * FirmaElectronicaSection.tsx — Componente compartido de Firma Electrónica.
 *
 * Funciona en dos contextos:
 *   - Sin tenantId → modo cliente: el propio tenant gestiona su certificado.
 *   - Con tenantId → modo admin: el SuperAdmin gestiona el cert de un tenant.
 *
 * La data es la misma en BD: si el cliente sube su cert, el admin lo ve;
 * si el admin lo configura, el cliente lo ve al entrar a Configuración.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  ShieldCheck, Upload, Save, Eye, EyeOff,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import { colors, radius } from '../../styles/colors';
import { notify } from '../../utils/notify';

// ── Servicios (importados dinámicamente según contexto) ───────────────────────
import {
  getFirma as clientGetFirma,
  updateFirma as clientUpdateFirma,
  uploadCertificado,
  type ConfigFirma,
} from '../../services/config.service';
import { superAdminSvc } from '../../superadmin/services/superadmin.service';

// ── Tipos internos ────────────────────────────────────────────────────────────

/** Forma normalizada del estado del certificado, independiente del contexto. */
interface FirmaStatus {
  tiene_certificado: boolean;
  tiene_password:    boolean;
  archivo_nombre:    string | null;
  nit:               string | null;
  fecha_vencimiento: string | null;
}

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

const fieldS: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={fieldS}>
      <label style={labelS}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  /** Sin tenantId → contexto cliente. Con tenantId → contexto admin. */
  tenantId?: number;
}

export function FirmaElectronicaSection({ tenantId }: Props) {
  const isAdmin = tenantId !== undefined;
  const fileRef = useRef<HTMLInputElement>(null);

  const [status,     setStatus]     = useState<FirmaStatus | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [showPass,   setShowPass]   = useState(false);

  // ── Campos del formulario ──────────────────────────────────────────────────
  const [password,    setPassword]    = useState('');
  const [nit,         setNit]         = useState('');
  const [vencimiento, setVencimiento] = useState('');

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const data = await superAdminSvc.getFirma(tenantId!);
        const s: FirmaStatus = {
          tiene_certificado: !!data?.archivo_nombre,
          tiene_password:    !!(data?.archivo_nombre),
          archivo_nombre:    data?.archivo_nombre ?? null,
          nit:               data?.nit_certificado ?? null,
          fecha_vencimiento: data?.fecha_vencimiento ?? null,
        };
        setStatus(s);
        setNit(data?.nit_certificado ?? '');
        setVencimiento(data?.fecha_vencimiento ? data.fecha_vencimiento.slice(0, 10) : '');
      } else {
        const data: ConfigFirma = await clientGetFirma();
        const s: FirmaStatus = {
          tiene_certificado: data.tiene_certificado,
          tiene_password:    data.tiene_password,
          archivo_nombre:    null, // el cliente no ve la ruta del servidor
          nit:               data.nit_certificado  ?? null,
          fecha_vencimiento: data.fecha_vencimiento ?? null,
        };
        setStatus(s);
        setNit(data.nit_certificado  ?? '');
        setVencimiento(data.fecha_vencimiento ? data.fecha_vencimiento.slice(0, 10) : '');
      }
    } catch {
      notify.error('No se pudo cargar la configuración de firma');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenantId]);

  // ── Subir certificado (cliente o admin) ────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (isAdmin) {
        await superAdminSvc.uploadCertificado(tenantId!, file);
      } else {
        await uploadCertificado(file);
      }
      await load();
      notify.success('Certificado cargado correctamente');
    } catch (ex: any) {
      notify.error('Error al subir el certificado', ex.response?.data?.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Guardar datos ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      if (isAdmin) {
        await superAdminSvc.updateFirma(tenantId!, {
          certificado_pass:  password  || undefined,
          nit_certificado:   nit       || undefined,
          fecha_vencimiento: vencimiento || undefined,
        });
      } else {
        const payload: any = {
          nit_certificado:   nit,
          fecha_vencimiento: vencimiento || undefined,
        };
        if (password) payload.certificado_pass = password;
        await clientUpdateFirma(payload);
      }
      setPassword('');
      await load();
      notify.success('Datos de firma guardados');
    } catch (ex: any) {
      notify.error('Error al guardar', ex.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Cálculo de vencimiento ─────────────────────────────────────────────────
  const diasParaVencer = status?.fecha_vencimiento
    ? Math.ceil((new Date(status.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;
  const vencido           = diasParaVencer !== null && diasParaVencer < 0;
  const venceProximamente = diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= 30;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Header ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={18} color={colors.textSecondary} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
            Firma Electrónica
          </h2>
        </div>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
          {isAdmin
            ? 'Configure el certificado digital (.p12/.pfx) del cliente. Los cambios son visibles inmediatamente en el panel del cliente.'
            : 'Certificado digital (.p12/.pfx) emitido por una AC autorizada por el MH. Cada cliente del ERP tiene su propio certificado personal.'}
        </p>
      </div>

      {/* ── Alerta vencimiento ── */}
      {vencido && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: colors.dangerBg, borderRadius: radius.sm, border: `1px solid ${colors.dangerBorder}` }}>
          <AlertTriangle size={16} color={colors.danger} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: colors.dangerText }}>
            <strong>Certificado vencido.</strong>{' '}
            {isAdmin ? 'El cliente debe renovar su certificado ante la AC autorizada por el MH.' : 'Renueve su certificado ante la AC autorizada por el MH.'}
          </div>
        </div>
      )}
      {venceProximamente && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: '#fff8e1', borderRadius: radius.sm, border: '1px solid #ffd54f' }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#92400e' }}>
            El certificado vence en <strong>{diasParaVencer} días</strong>.{' '}
            {isAdmin ? 'Notifique al cliente para que lo renueve.' : 'Renuévelo antes de que expire.'}
          </div>
        </div>
      )}

      {/* ── Tarjeta de estado ── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 18px', background: colors.pageBg, borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
        <div style={{
          width: 48, height: 48, borderRadius: radius.md,
          background: status?.tiene_certificado ? 'rgba(16,185,129,0.1)' : colors.mutedBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ShieldCheck size={22} color={status?.tiene_certificado ? colors.success : colors.textMuted} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
            {status?.tiene_certificado ? 'Certificado configurado' : 'Sin certificado'}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {status?.tiene_certificado
              ? [
                  isAdmin && status.archivo_nombre ? status.archivo_nombre : null,
                  status.nit ? `NIT: ${status.nit}` : null,
                  status.fecha_vencimiento
                    ? `Vence: ${new Date(status.fecha_vencimiento).toLocaleDateString('es-SV')}`
                    : null,
                ].filter(Boolean).join(' · ') || 'Certificado cargado en el servidor'
              : isAdmin
                ? 'Complete los campos para configurar la firma del cliente'
                : 'Suba el archivo .p12 o .pfx entregado por la Autoridad Certificadora'}
          </div>
          {status?.tiene_password && (
            <div style={{ fontSize: 12, color: colors.success, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={12} /> Contraseña guardada
            </div>
          )}
        </div>

        {/* Botón subir — disponible en ambos contextos */}
        <>
          <input ref={fileRef} type="file" accept=".p12,.pfx" style={{ display: 'none' }} onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 18px',
              background: uploading ? '#c8c8c8' : colors.accent,
              color: colors.accentText, border: 'none',
              borderRadius: radius.sm, fontSize: 13, fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer', flexShrink: 0,
            }}
          >
            <Upload size={14} />
            {uploading ? 'Subiendo...' : status?.tiene_certificado ? 'Reemplazar .p12' : 'Subir .p12'}
          </button>
        </>
      </div>

      {/* ── Datos del certificado ── */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 20px' }}>
          <Field
            label={`Contraseña del certificado${status?.tiene_password ? ' ✓' : ''}`}
            hint="PIN de la firma electrónica"
          >
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputS, paddingRight: 40 }}
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={status?.tiene_password ? '(dejar vacío para no cambiar)' : 'Contraseña del .p12'}
              />
              <button
                onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 0, display: 'flex' }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <Field label="NIT del certificado" hint="NIT al que está registrado el certificado">
            <input
              style={inputS}
              value={nit}
              onChange={e => setNit(e.target.value)}
              placeholder="06140101000000"
            />
          </Field>

          <Field label="Fecha de vencimiento" hint="Para mostrar alertas de renovación">
            <input
              style={inputS}
              type="date"
              value={vencimiento}
              onChange={e => setVencimiento(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* ── Info box ── */}
      <div style={{ padding: '14px 16px', background: colors.pageBg, borderRadius: radius.sm, border: `1px solid ${colors.borderLight}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Información sobre el certificado
        </div>
        <ul style={{ fontSize: 12, color: colors.textSecondary, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
          <li>Cada emisor DTE debe obtener su propio certificado ante una AC autorizada por el MH</li>
          <li>El certificado usa cifrado RSA de 4096 bits y tiene vigencia limitada</li>
          {isAdmin
            ? <li>La ruta del servidor debe ser accesible por el proceso del backend</li>
            : <li>El archivo se almacena de forma segura en el servidor del ERP</li>}
          <li>La contraseña se guarda cifrada — nunca se muestra en texto plano</li>
          <li>El trámite del certificado se realiza siguiendo el Manual de Acreditamiento del MH</li>
        </ul>
      </div>

      {/* ── Botón guardar ── */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px',
            background: saving ? '#c8c8c8' : colors.accent,
            color: colors.accentText,
            border: 'none', borderRadius: radius.md,
            fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar datos de firma'}
        </button>
      </div>
    </div>
  );
}
