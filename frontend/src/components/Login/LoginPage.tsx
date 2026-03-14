/**
 * LoginPage.tsx — Pantalla de inicio de sesión con soporte multi-tenant.
 *
 * Flujo en 2 pasos:
 *   Paso 1: El usuario ingresa el código de empresa (tenant slug).
 *           Si es válido, se muestra el nombre de la empresa y pasa al paso 2.
 *   Paso 2: Ingresa usuario y contraseña dentro de esa empresa.
 *
 * Diseño split-screen: panel de marca (izquierda) + formulario (derecha).
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, getTenantBySlug } from '../../context/AuthContext';
import { TenantPublicInfo }          from '../../services/auth.service';
import { Package, Eye, EyeOff, ArrowLeft } from 'lucide-react';

type Step = 'empresa' | 'credenciales';

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1px solid #e5e5e5', borderRadius: 10,
  fontSize: 14, color: '#111111', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  background: '#fafafa',
};

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate        = useNavigate();

  const [step,         setStep]         = useState<Step>('empresa');
  const [slug,         setSlug]         = useState('');
  const [tenant,       setTenant]       = useState<TenantPublicInfo | null>(null);
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Paso 1: verificar slug de empresa ────────────────────────────────────────
  const handleVerifyEmpresa = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!slug.trim()) { setError('Ingresa el código de empresa'); return; }

    setLoading(true);
    try {
      const info = await getTenantBySlug(slug.trim().toLowerCase());
      setTenant(info);
      setStep('credenciales');
    } catch {
      setError('Código de empresa no encontrado. Verifica con tu administrador.');
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: login con credenciales ────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) { setError('Usuario y contraseña son requeridos'); return; }

    setLoading(true);
    try {
      await login(username.trim(), password, slug.trim().toLowerCase());
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmpresa = () => {
    setStep('empresa');
    setTenant(null);
    setUsername('');
    setPassword('');
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
      transition={{ duration: 0.35, ease: [0.4, 0, 1, 1] }}
      style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      {/* ── Panel izquierdo — Branding ────────────────────────────────────────── */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            flex: '0 0 45%', background: 'var(--accent, #111111)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 48px', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', textAlign: 'center', color: 'var(--accent-text, #ffffff)' }}>
            <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.15)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Package size={40} color="var(--accent-text, #ffffff)" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', color: 'var(--accent-text, #ffffff)' }}>
              {tenant?.nombre ?? 'ERP System'}
            </h1>
            <p style={{ fontSize: 14, margin: '0 0 52px', opacity: 0.65, color: 'var(--accent-text, #ffffff)', fontWeight: 400 }}>
              Sistema de gestión empresarial
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
              {['Ventas y facturación electrónica', 'Control de inventario y compras', 'Reportes y estadísticas en tiempo real'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-text, #ffffff)', opacity: 0.5, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, opacity: 0.7, color: 'var(--accent-text, #ffffff)', fontWeight: 400 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Panel derecho — Formulario ─────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: '100%', maxWidth: 380 }}
        >
          {/* ── PASO 1: Código de empresa ──────────────────────────────────────── */}
          {step === 'empresa' && (
            <>
              <div style={{ marginBottom: 36 }}>
                {isMobile && (
                  <div style={{ width: 52, height: 52, background: 'var(--accent, #111111)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <Package size={26} color="#ffffff" />
                  </div>
                )}
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                  Ingresa a tu empresa
                </h2>
                <p style={{ fontSize: 14, color: '#9b9b9b', margin: 0 }}>
                  Ingresa el código de empresa que te proporcionó el administrador
                </p>
              </div>

              <form onSubmit={handleVerifyEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                    {error}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Código de empresa
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="ej: mi-empresa"
                    autoFocus
                    style={INPUT_STYLE}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent, #111111)'; e.target.style.background = '#fff'; }}
                    onBlur={e  => { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ marginTop: 8, padding: '13px', background: loading ? '#c8c8c8' : 'var(--accent, #111111)', color: 'var(--accent-text, #ffffff)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Verificando...' : 'Continuar →'}
                </button>
              </form>
            </>
          )}

          {/* ── PASO 2: Usuario y contraseña ────────────────────────────────────── */}
          {step === 'credenciales' && (
            <>
              <div style={{ marginBottom: 36 }}>
                <button onClick={goBackToEmpresa} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b9b9b', fontSize: 13, padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={14} /> Cambiar empresa
                </button>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e5e5', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Package size={18} color="var(--accent, #111111)" />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111' }}>{tenant?.nombre}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#9b9b9b' }}>{slug}</p>
                  </div>
                  {tenant?.estado === 'pruebas' && (
                    <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                      PRUEBAS
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Bienvenido</h2>
                <p style={{ fontSize: 14, color: '#9b9b9b', margin: 0 }}>Ingresa tus credenciales para acceder</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                    {error}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ej. admin"
                    autoComplete="username"
                    autoFocus
                    style={INPUT_STYLE}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent, #111111)'; e.target.style.background = '#fff'; }}
                    onBlur={e  => { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{ ...INPUT_STYLE, paddingRight: 44 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--accent, #111111)'; e.target.style.background = '#fff'; }}
                      onBlur={e  => { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9b9b9b', display: 'flex', padding: 2 }}
                    >
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ marginTop: 8, padding: '13px', background: loading ? '#c8c8c8' : 'var(--accent, #111111)', color: 'var(--accent-text, #ffffff)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
