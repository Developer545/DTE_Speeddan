/**
 * LoginPage.tsx — Login del panel SuperAdmin.
 * Diseño split-screen: panel izquierdo oscuro + formulario derecho blanco.
 *
 * Flujo de 2 pasos:
 *   Paso 1 → usuario + contraseña
 *   Paso 2 → código TOTP de 6 dígitos (solo si el servidor responde requires2FA=true)
 */

import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1px solid #e5e5e5', borderRadius: 10,
  fontSize: 14, color: '#111111', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  background: '#fafafa',
};

const DIGIT_STYLE: React.CSSProperties = {
  width: 44, height: 54,
  border: '1px solid #e5e5e5', borderRadius: 10,
  fontSize: 22, fontWeight: 700, textAlign: 'center',
  color: '#111111', outline: 'none',
  background: '#fafafa', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function SuperAdminLoginPage() {
  const { login, login2FA } = useSuperAdminAuth();
  const navigate             = useNavigate();

  // ── Estado paso 1 ──────────────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  // ── Estado paso 2 ──────────────────────────────────────────────────────────
  const [step,      setStep]      = useState<1 | 2>(1);
  const [tempToken, setTempToken] = useState('');
  const [digits,    setDigits]    = useState<string[]>(Array(6).fill(''));
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Estado compartido ──────────────────────────────────────────────────────
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-enviar cuando los 6 dígitos estén completos
  useEffect(() => {
    if (step === 2 && digits.every(d => d !== '')) {
      handleSubmit2FA();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  // ── Handlers paso 1 ────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) { setError('Usuario y contraseña son requeridos'); return; }
    setLoading(true);
    try {
      const challenge = await login(username.trim(), password);
      if (challenge) {
        setTempToken(challenge.tempToken);
        setStep(2);
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
      } else {
        navigate('/superadmin/dashboard');
      }
    } catch (err: any) {
      setError(err.message ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers paso 2 ────────────────────────────────────────────────────────

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);
    if (digit && index < 5) digitRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
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
    setDigits(next);
    digitRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit2FA = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Ingresa los 6 dígitos del código'); return; }
    setError(null);
    setLoading(true);
    try {
      await login2FA(tempToken, code);
      navigate('/superadmin/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Código incorrecto');
      setDigits(Array(6).fill(''));
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1); setTempToken(''); setDigits(Array(6).fill('')); setError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const leftFeatures = step === 1
    ? ['Gestión de clientes y suscripciones', 'Control de pagos y vencimientos', 'Configuración por empresa']
    : ['Abre Google Authenticator o Authy', 'Ingresa el código de 6 dígitos', 'El código se renueva cada 30 segundos'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Panel izquierdo — Branding ────────────────────────────────────── */}
      {!isMobile && (
        <div style={{ flex: '0 0 45%', background: 'var(--accent, #111111)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', textAlign: 'center', color: 'var(--accent-text, #ffffff)' }}>
            <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.15)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', border: '1px solid rgba(255,255,255,0.2)' }}>
              {step === 1 ? <ShieldCheck size={40} color="var(--accent-text, #ffffff)" /> : <KeyRound size={40} color="var(--accent-text, #ffffff)" />}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', color: 'var(--accent-text, #ffffff)' }}>Super Admin</h1>
            <p style={{ fontSize: 14, margin: '0 0 52px', opacity: 0.65, color: 'var(--accent-text, #ffffff)', fontWeight: 400 }}>
              {step === 1 ? 'Panel de control del sistema' : 'Verificación en dos pasos'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
              {leftFeatures.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-text, #ffffff)', opacity: 0.5, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, opacity: 0.7, color: 'var(--accent-text, #ffffff)', fontWeight: 400 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Panel derecho — Formulario ─────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {step === 1 ? (
            /* ── PASO 1: Usuario + Contraseña ──────────────────────────────── */
            <>
              <div style={{ marginBottom: 36 }}>
                {isMobile && (
                  <div style={{ width: 52, height: 52, background: 'var(--accent, #111111)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <ShieldCheck size={26} color="#ffffff" />
                  </div>
                )}
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Acceso restringido</h2>
                <p style={{ fontSize: 14, color: '#9b9b9b', margin: 0 }}>Panel exclusivo para administradores del sistema</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{error}</div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="superadmin" autoFocus autoComplete="username" style={INPUT_STYLE}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent, #111111)'; e.target.style.background = '#fff'; }}
                    onBlur={e  => { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                      style={{ ...INPUT_STYLE, paddingRight: 44 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--accent, #111111)'; e.target.style.background = '#fff'; }}
                      onBlur={e  => { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; }} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9b9b9b', display: 'flex', padding: 2 }}>
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  style={{ marginTop: 8, padding: '13px', background: loading ? '#c8c8c8' : 'var(--accent, #111111)', color: 'var(--accent-text, #ffffff)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Verificando...' : 'Ingresar'}
                </button>
              </form>
            </>
          ) : (
            /* ── PASO 2: Código TOTP ────────────────────────────────────────── */
            <>
              <div style={{ marginBottom: 36 }}>
                {isMobile && (
                  <div style={{ width: 52, height: 52, background: 'var(--accent, #111111)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <KeyRound size={26} color="#ffffff" />
                  </div>
                )}
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Verificación en dos pasos</h2>
                <p style={{ fontSize: 14, color: '#9b9b9b', margin: 0 }}>Ingresa el código de 6 dígitos de tu app autenticadora</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{error}</div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código de verificación</label>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {digits.map((digit, idx) => (
                      <input key={idx} ref={el => { digitRefs.current[idx] = el; }}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleDigitChange(idx, e.target.value)}
                        onKeyDown={e => handleDigitKeyDown(idx, e)}
                        onPaste={handleDigitPaste}
                        style={{ ...DIGIT_STYLE, borderColor: digit ? 'var(--accent, #111111)' : '#e5e5e5', background: digit ? '#fff' : '#fafafa' }}
                        onFocus={e => { e.target.style.borderColor = 'var(--accent, #111111)'; e.target.style.background = '#fff'; }}
                        onBlur={e  => { if (!e.target.value) { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; } }}
                        aria-label={`Dígito ${idx + 1}`} />
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#9b9b9b', margin: '10px 0 0', textAlign: 'center' }}>El código se renueva cada 30 segundos</p>
                </div>

                <button type="button" onClick={handleSubmit2FA} disabled={loading || digits.some(d => d === '')}
                  style={{ padding: '13px', background: (loading || digits.some(d => d === '')) ? '#c8c8c8' : 'var(--accent, #111111)', color: 'var(--accent-text, #ffffff)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, width: '100%', cursor: (loading || digits.some(d => d === '')) ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Verificando...' : 'Confirmar'}
                </button>

                <button type="button" onClick={handleBackToStep1}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: 'none', border: '1px solid #e5e5e5', borderRadius: 12, fontSize: 14, color: '#6b6b6b', fontWeight: 500, width: '100%', cursor: 'pointer' }}>
                  <ArrowLeft size={16} />
                  Volver al inicio de sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
