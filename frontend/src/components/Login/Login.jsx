import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { getTheme } from './themes';
import './styles.css';
import fondoLogin from '../../assets/fondo_login.jpg';

/**
 * Modern Login Component - Fully Customizable
 *
 * @param {Object} props - Component props
 * @param {string} props.theme - Theme name (sunset, ocean, midnight, forest, rose)
 * @param {Function} props.onLogin - Callback when login is submitted
 * @param {Function} props.onGoogleLogin - Callback for Google login
 * @param {Function} props.onRegister - Callback for register link
 * @param {React.ReactNode} props.logo - Custom logo component
 * @param {string} props.brandName - Brand name for the app
 */
const Login = ({
  theme = 'sunset',
  onLogin = (data) => console.log('Login:', data),
  onGoogleLogin = () => console.log('Google login'),
  onRegister = () => console.log('Navigate to register'),
  onForgotPassword = () => console.log('Navigate to forgot password'),
  logo = null,
  brandName = 'YourApp',
  showPasswordStrength = false,
  rememberMe = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [touched, setTouched] = useState({});

  const currentTheme = getTheme(theme);

  // Calculate password strength
  const calculatePasswordStrength = (pass) => {
    if (!pass) return 0;

    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength++;

    return strength;
  };

  const getPasswordStrengthClass = (strength) => {
    if (strength <= 2) return 'strength-weak';
    if (strength <= 3) return 'strength-medium';
    return 'strength-strong';
  };

  const getPasswordStrengthText = (strength) => {
    if (strength <= 2) return 'Débil';
    if (strength <= 3) return 'Media';
    return 'Fuerte';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'El correo es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Correo inválido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsLoading(true);
      try {
        await onLogin({ email, password });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `
        ${currentTheme.bg},
        url(${fondoLogin})
      `,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundBlendMode: 'multiply',
      fontFamily: currentTheme.font,
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    },
    backgroundOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: currentTheme.bg,
      opacity: 0.2,  // 60% color - 40% imagen (más visible)
      zIndex: 1
    },
    decorativeCircle1: {
      position: 'absolute',
      top: '-10%',
      right: '-5%',
      width: '400px',
      height: '400px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.05)',
      filter: 'blur(60px)',
      animation: 'float 20s ease-in-out infinite',
      zIndex: 2
    },
    decorativeCircle2: {
      position: 'absolute',
      bottom: '-15%',
      left: '-8%',
      width: '500px',
      height: '500px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.03)',
      filter: 'blur(80px)',
      animation: 'float 25s ease-in-out infinite reverse',
      zIndex: 2
    },
    card: {
      background: currentTheme.glass,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: `1px solid ${currentTheme.glassBorder}`,
      padding: '48px 40px',
      width: '100%',
      maxWidth: '440px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      position: 'relative',
      zIndex: 10,
      animation: 'slideUp 0.6s ease-out'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px'
    },
    logo: {
      width: '64px',
      height: '64px',
      margin: '0 auto 20px',
      background: currentTheme.accent,
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      animation: 'pulse 2s ease-in-out infinite'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: currentTheme.text,
      margin: '0 0 8px 0',
      letterSpacing: '-0.5px'
    },
    subtitle: {
      fontSize: '15px',
      color: currentTheme.textSecondary,
      margin: 0,
      fontWeight: '400'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: currentTheme.text,
      marginBottom: '4px'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '15px',
      border: `1.5px solid ${currentTheme.inputBorder}`,
      borderRadius: '12px',
      background: currentTheme.inputBg,
      color: currentTheme.text,
      outline: 'none',
      transition: 'all 0.3s ease',
      fontFamily: currentTheme.font,
      boxSizing: 'border-box'
    },
    inputFocus: {
      border: `1.5px solid ${currentTheme.accent}`,
      background: 'rgba(255, 255, 255, 0.08)'
    },
    error: {
      fontSize: '13px',
      color: '#ef4444',
      marginTop: '4px'
    },
    forgotPassword: {
      textAlign: 'right',
      marginTop: '-8px'
    },
    link: {
      color: currentTheme.accent,
      fontSize: '14px',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'opacity 0.2s',
      cursor: 'pointer'
    },
    button: {
      width: '100%',
      padding: '16px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      background: currentTheme.buttonGradient,
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: currentTheme.font,
      marginTop: '8px',
      position: 'relative',
      overflow: 'hidden'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      margin: '28px 0'
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: currentTheme.inputBorder
    },
    dividerText: {
      fontSize: '13px',
      color: currentTheme.textSecondary,
      fontWeight: '500'
    },
    googleButton: {
      width: '100%',
      padding: '14px',
      fontSize: '15px',
      fontWeight: '600',
      color: currentTheme.text,
      background: 'rgba(255, 255, 255, 0.1)',
      border: `1.5px solid ${currentTheme.inputBorder}`,
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: currentTheme.font,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px'
    },
    footer: {
      textAlign: 'center',
      marginTop: '28px'
    },
    footerText: {
      fontSize: '14px',
      color: currentTheme.textSecondary,
      margin: 0
    }
  };

  return (
    <div style={styles.container}>
      {/* Overlay de color sobre la imagen */}
      <div style={styles.backgroundOverlay} />

      <div style={styles.decorativeCircle1} />
      <div style={styles.decorativeCircle2} />

      <div style={styles.card} className="hover-lift">
        <div style={styles.header}>
          <div style={styles.logo}>
            {logo || <Camera size={32} color="#ffffff" />}
          </div>
          <h1 style={styles.title}>Bienvenido</h1>
          <p style={styles.subtitle}>Inicia sesión para continuar</p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, styles.input)}
            />
            {errors.email && <span style={styles.error}>{errors.email}</span>}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordStrength(calculatePasswordStrength(e.target.value));
                }}
                style={{...styles.input, paddingRight: '45px'}}
                className={errors.password && touched.password ? 'input-error' : ''}
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => {
                  Object.assign(e.target.style, styles.input);
                  setTouched({...touched, password: true});
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {showPasswordStrength && password && (
              <div style={styles.passwordStrengthContainer}>
                <div className="password-strength-bar">
                  <div className={`password-strength-fill ${getPasswordStrengthClass(passwordStrength)}`} />
                </div>
                <span style={styles.passwordStrengthText}>
                  Fortaleza: {getPasswordStrengthText(passwordStrength)}
                </span>
              </div>
            )}
            {errors.password && touched.password && <span style={styles.error}>{errors.password}</span>}
          </div>

          <div style={styles.forgotPassword}>
            <a style={styles.link} className="hover-opacity">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            style={{...styles.button, ...(isLoading ? styles.buttonDisabled : {})}}
            disabled={isLoading}
            className="hover-scale"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>O CONTINUAR CON</span>
          <div style={styles.dividerLine} />
        </div>

        <button
          onClick={onGoogleLogin}
          style={styles.googleButton}
          className="hover-scale"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
            <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
            <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            ¿No tienes cuenta?{' '}
            <a
              onClick={onRegister}
              style={styles.link}
              className="hover-opacity"
            >
              Regístrate
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
