/**
 * Setup2FAModal.tsx — Modal para configurar el 2FA (TOTP) del SuperAdmin.
 *
 * Flujo:
 *   1. El componente padre llama a superAdminSvc.setup2FA() y pasa qrUrl + secret como props.
 *   2. El usuario escanea el QR con Google Authenticator, Authy, etc.
 *   3. El usuario ingresa el código de 6 dígitos para confirmar la configuración.
 *   4. El modal llama a onVerified() cuando el servidor activa el 2FA con éxito.
 *
 * Uso:
 *   const [setup2FAData, setSetup2FAData] = useState<{ qrUrl: string; secret: string } | null>(null);
 *   const handleSetup = async () => {
 *     const data = await superAdminSvc.setup2FA();
 *     setSetup2FAData(data);
 *   };
 *   {setup2FAData && (
 *     <Setup2FAModal
 *       qrUrl={setup2FAData.qrUrl}
 *       secret={setup2FAData.secret}
 *       onVerified={() => { setSetup2FAData(null); refetchStatus(); }}
 *       onClose={() => setSetup2FAData(null)}
 *     />
 *   )}
 */

import React, { useState, useRef } from 'react';
import { X, Copy, Check, ShieldCheck } from 'lucide-react';
import { superAdminSvc } from '../services/superadmin.service';

interface Setup2FAModalProps {
  /** Data URL PNG del código QR — generado por el backend */
  qrUrl:      string;
  /** Secreto TOTP en Base32 para entrada manual en la app autenticadora */
  secret:     string;
  /** Callback cuando el 2FA se activa correctamente */
  onVerified: () => void;
  /** Callback para cerrar el modal sin activar el 2FA */
  onClose:    () => void;
}

const DIGIT_STYLE: React.CSSProperties = {
  width: 40, height: 50,
  border: '1px solid #e5e5e5', borderRadius: 8,
  fontSize: 20, fontWeight: 700, textAlign: 'center',
  color: '#111111', outline: 'none',
  background: '#fafafa', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function Setup2FAModal({ qrUrl, secret, onVerified, onClose }: Setup2FAModalProps) {
  const [code,    setCode]    = useState<string[]>(Array(6).fill(''));
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...code];
    next[index] = digit;
    setCode(next);
    setError(null);
    if (digit && index < 5) digitRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const next = [...code];
      next[index - 1] = '';
      setCode(next);
      digitRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft'  && index > 0) digitRefs.current[index - 1]?.focus();
    else if (e.key === 'ArrowRight' && index < 5) digitRefs.current[index + 1]?.focus();
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted.length) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setCode(next);
    digitRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
    } catch {
      const el = document.createElement('textarea');
      el.value = secret;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Ingresa los 6 dígitos del código'); return; }
    setError(null);
    setLoading(true);
    try {
      await superAdminSvc.verify2FASetup(fullCode);
      onVerified();
    } catch (e: any) {
      setError(e.message ?? 'Código incorrecto. Verifica que la hora de tu dispositivo sea correcta.');
      setCode(Array(6).fill(''));
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Inter', sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#ffffff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: '#111111', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', margin: 0, letterSpacing: '-0.3px' }}>Configurar 2FA</h2>
              <p style={{ fontSize: 13, color: '#9b9b9b', margin: '2px 0 0' }}>Autenticación de dos factores</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b9b9b', padding: 4, display: 'flex', flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Paso 1: Escanear QR */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paso 1 — Escanea el código QR</p>
          <p style={{ fontSize: 13, color: '#6b6b6b', margin: '0 0 16px' }}>Abre Google Authenticator, Authy o cualquier app compatible y escanea el código.</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ border: '1px solid #e5e5e5', borderRadius: 12, padding: 12, background: '#fafafa' }}>
              <img src={qrUrl} alt="Código QR para autenticador" style={{ display: 'block', width: 180, height: 180 }} />
            </div>
          </div>
        </div>

        {/* Clave manual */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clave manual (si no puedes escanear)</p>
          <p style={{ fontSize: 13, color: '#6b6b6b', margin: '0 0 10px' }}>Ingresa esta clave directamente en tu app autenticadora.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: 10, padding: '10px 12px' }}>
            <code style={{ flex: 1, fontSize: 13, fontFamily: "'Courier New', Courier, monospace", color: '#111111', wordBreak: 'break-all', letterSpacing: '0.5px' }}>{secret}</code>
            <button type="button" onClick={handleCopySecret} title="Copiar clave"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#16a34a' : '#9b9b9b', display: 'flex', padding: 4, flexShrink: 0 }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          {copied && <p style={{ fontSize: 12, color: '#16a34a', margin: '6px 0 0' }}>Clave copiada al portapapeles</p>}
        </div>

        {/* Paso 2: Verificar código */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paso 2 — Verifica el código</p>
          <p style={{ fontSize: 13, color: '#6b6b6b', margin: '0 0 14px' }}>Ingresa el código de 6 dígitos que muestra tu app para confirmar la configuración.</p>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 500, marginBottom: 14 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {code.map((digit, idx) => (
              <input key={idx} ref={el => { digitRefs.current[idx] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleDigitChange(idx, e.target.value)}
                onKeyDown={e => handleDigitKeyDown(idx, e)}
                onPaste={handleDigitPaste}
                style={{ ...DIGIT_STYLE, borderColor: digit ? '#111111' : '#e5e5e5', background: digit ? '#fff' : '#fafafa' }}
                onFocus={e => { e.target.style.borderColor = '#111111'; e.target.style.background = '#fff'; }}
                onBlur={e  => { if (!e.target.value) { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; } }}
                aria-label={`Dígito ${idx + 1}`} />
            ))}
          </div>

          <button type="button" onClick={handleVerify} disabled={loading || code.some(d => d === '')}
            style={{ width: '100%', padding: '13px', background: (loading || code.some(d => d === '')) ? '#c8c8c8' : '#111111', color: '#ffffff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: (loading || code.some(d => d === '')) ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Verificando...' : 'Activar autenticación de dos factores'}
          </button>
        </div>
      </div>
    </div>
  );
}
