/**
 * APIHaciendaSection.tsx — Componente compartido de configuración API MH.
 *
 * Funciona en dos contextos:
 *   - Sin tenantId → modo cliente: el propio tenant gestiona sus credenciales.
 *   - Con tenantId → modo admin: el SuperAdmin gestiona las credenciales del tenant.
 *
 * La data es la misma en BD: si el cliente guarda sus credenciales, el admin las ve;
 * si el admin las configura, el cliente las ve en Configuración.
 */

import React, { useEffect, useState } from 'react';
import { Globe, Save, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { colors, radius } from '../../styles/colors';
import { getAPIMH, updateAPIMH } from '../../services/config.service';
import { superAdminSvc } from '../../superadmin/services/superadmin.service';
import { notify } from '../../utils/notify';

// ── URLs por defecto según ambiente ───────────────────────────────────────────

const URLS: Record<string, { auth: string; transmision: string }> = {
  '00': {
    auth:        'https://apitest.dtes.mh.gob.sv/seguridad/auth',
    transmision: 'https://apitest.dtes.mh.gob.sv/fesv/recepciondte',
  },
  '01': {
    auth:        'https://api.dtes.mh.gob.sv/seguridad/auth',
    transmision: 'https://api.dtes.mh.gob.sv/fesv/recepciondte',
  },
};

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Sin tenantId → contexto cliente. Con tenantId → contexto admin. */
  tenantId?: number;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function APIHaciendaSection({ tenantId }: Props) {
  const isAdmin = tenantId !== undefined;

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Estado del token (solo lectura)
  const [tieneToken,    setTieneToken]    = useState(false);
  const [tokenExpira,   setTokenExpira]   = useState<string | null>(null);
  const [tienePassword, setTienePassword] = useState(false);

  // Campos del formulario
  const [ambiente,       setAmbiente]       = useState('00');
  const [urlAuth,        setUrlAuth]        = useState(URLS['00'].auth);
  const [urlTransmision, setUrlTransmision] = useState(URLS['00'].transmision);
  const [usuario,        setUsuario]        = useState('');
  const [password,       setPassword]       = useState('');

  // ── Carga ─────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const d = isAdmin
        ? await superAdminSvc.getApiMh(tenantId!)
        : await getAPIMH();

      if (d) {
        setAmbiente(d.ambiente        ?? '00');
        setUrlAuth(d.url_auth         ?? URLS['00'].auth);
        setUrlTransmision(d.url_transmision ?? URLS['00'].transmision);
        setUsuario(d.usuario_api      ?? '');
        setTienePassword(!!d.tiene_password);
        setTieneToken(!!d.tiene_token);
        setTokenExpira(d.token_expira_en ?? null);
      }
    } catch { notify.error('No se pudo cargar la configuración API'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [tenantId]);

  // ── Al cambiar ambiente → actualizar URLs automáticamente ─────────────────
  const handleAmbienteChange = (val: string) => {
    setAmbiente(val);
    const urls = URLS[val];
    if (urls) { setUrlAuth(urls.auth); setUrlTransmision(urls.transmision); }
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ambiente, url_auth: urlAuth, url_transmision: urlTransmision,
        usuario_api: usuario,
      };
      if (password) payload.password_api = password;

      if (isAdmin) {
        await superAdminSvc.updateApiMh(tenantId!, payload);
      } else {
        await updateAPIMH(payload);
      }
      setPassword('');
      await load();
      notify.success('Configuración API guardada');
    } catch (e: any) { notify.error('Error al guardar', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Cargando...</div>;

  const isProduccion = ambiente === '01';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Globe size={18} color={colors.textSecondary} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
          API Ministerio de Hacienda
        </h2>
      </div>
      <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24, marginTop: 4 }}>
        {isAdmin
          ? 'Configure las credenciales del cliente para autenticarse y transmitir DTE al MH. Los cambios son visibles inmediatamente en el panel del cliente.'
          : 'Credenciales para autenticarse y transmitir DTE al sistema del MH. El token se obtiene automáticamente y es válido 24 horas.'}
      </p>

      {/* Alerta producción */}
      {isProduccion && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: '#fff8e1', borderRadius: radius.sm, border: '1px solid #ffd54f', marginBottom: 20 }}>
          <AlertTriangle size={16} color='#f59e0b' style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#92400e' }}>
            <strong>Ambiente Producción.</strong> Los DTE emitidos tendrán validez fiscal real ante el Ministerio de Hacienda.
          </div>
        </div>
      )}

      {/* Estado del token */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', background: colors.pageBg, borderRadius: radius.sm, border: `1px solid ${colors.borderLight}`, marginBottom: 20 }}>
        {tieneToken
          ? <CheckCircle size={14} color={colors.success} />
          : <AlertTriangle size={14} color={colors.textMuted} />}
        <span style={{ fontSize: 13, color: colors.textSecondary }}>
          {tieneToken
            ? `Token activo${tokenExpira ? ` · Vence: ${new Date(tokenExpira).toLocaleString('es-SV')}` : ''}`
            : 'Sin token — se generará al transmitir el primer DTE'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>

        {/* Ambiente */}
        <div style={fieldS}>
          <label style={labelS}>Ambiente</label>
          <select
            style={{ ...inputS, cursor: 'pointer' }}
            value={ambiente}
            onChange={e => handleAmbienteChange(e.target.value)}
          >
            <option value="00">00 — Pruebas (apitest.dtes.mh.gob.sv)</option>
            <option value="01">01 — Producción (api.dtes.mh.gob.sv)</option>
          </select>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
            Cambia el ambiente automáticamente en todos los DTE generados
          </div>
        </div>

        {/* URL Auth */}
        <div style={fieldS}>
          <label style={labelS}>URL de Autenticación</label>
          <input
            style={{ ...inputS, fontFamily: 'monospace', fontSize: 12 }}
            value={urlAuth}
            onChange={e => setUrlAuth(e.target.value)}
          />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
            POST → obtiene el token de acceso (válido 24h)
          </div>
        </div>

        {/* URL Transmisión */}
        <div style={fieldS}>
          <label style={labelS}>URL de Transmisión DTE</label>
          <input
            style={{ ...inputS, fontFamily: 'monospace', fontSize: 12 }}
            value={urlTransmision}
            onChange={e => setUrlTransmision(e.target.value)}
          />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
            POST → envía el DTE firmado, recibe el sello de recepción
          </div>
        </div>

        {/* Credenciales */}
        <div style={{ padding: '16px 18px', background: colors.pageBg, borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            Credenciales de Acceso MH
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
            <div style={fieldS}>
              <label style={labelS}>Usuario (NIT del emisor)</label>
              <input
                style={inputS}
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="Ej: 06140101000000"
              />
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>NIT sin guiones, 14 dígitos</div>
            </div>
            <div style={fieldS}>
              <label style={labelS}>
                Contraseña API{' '}
                {tienePassword && <span style={{ color: colors.success, fontWeight: 600 }}>✓ Guardada</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputS, paddingRight: 40 }}
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tienePassword ? '(dejar vacío para no cambiar)' : 'Contraseña asignada por MH'}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 0 }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                13–25 caracteres, letras + números + carácter especial · Caduca cada 90 días
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guardar */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px',
            background: saving ? '#c8c8c8' : colors.accent, color: colors.accentText,
            border: 'none', borderRadius: radius.md, fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}
