import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaGithub, FaTwitter } from 'react-icons/fa';
import { loginSchema } from '../../schemas/authSchemas';
import { getTheme } from './themes';
import './styles.css';

/**
 * Login Component - Mejorado con React Hook Form, Zod, Framer Motion y React Icons
 */
const LoginImproved = ({
  theme = 'sunset',
  onLogin = async (data) => console.log('Login:', data),
  onSocialLogin = async (provider) => console.log('Social login:', provider),
  onRegister = () => console.log('Navigate to register'),
  onForgotPassword = () => console.log('Navigate to forgot password'),
  logo = null,
  brandName = 'YourApp',
  showRememberMe = true,
  socialProviders = ['google', 'facebook', 'github', 'twitter'],
  backgroundImage = null
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const currentTheme = getTheme(theme);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    watch
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  });

  const password = watch('password', '');

  // Calculate password strength
  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: '' };

    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score++;

    if (score <= 2) return { score, text: 'Débil', color: '#ef4444' };
    if (score <= 3) return { score, text: 'Media', color: '#f59e0b' };
    return { score, text: 'Fuerte', color: '#10b981' };
  };

  const passwordStrength = calculatePasswordStrength(password);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onLogin(data);
      setLoginSuccess(true);
      // Reset después de 2 segundos si es necesario
      setTimeout(() => setLoginSuccess(false), 2000);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      await onSocialLogin(provider);
    } catch (error) {
      console.error('Social login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSocialIcon = (provider) => {
    const icons = {
      google: <FcGoogle size={20} />,
      facebook: <FaFacebook size={20} color="#1877f2" />,
      github: <FaGithub size={20} color="#333" />,
      twitter: <FaTwitter size={20} color="#1da1f2" />
    };
    return icons[provider] || null;
  };

  const getSocialName = (provider) => {
    const names = {
      google: 'Google',
      facebook: 'Facebook',
      github: 'GitHub',
      twitter: 'Twitter'
    };
    return names[provider] || provider;
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: backgroundImage
        ? `${currentTheme.bg}, url(${backgroundImage})`
        : currentTheme.bg,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundBlendMode: backgroundImage ? 'multiply' : 'normal',
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
      opacity: backgroundImage ? 0.2 : 0,
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
      zIndex: 10
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
      fontSize: '32px'
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
    inputContainer: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    inputIcon: {
      position: 'absolute',
      left: '16px',
      color: currentTheme.textSecondary,
      pointerEvents: 'none',
      zIndex: 1
    },
    input: {
      width: '100%',
      padding: '14px 16px 14px 45px',
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
    inputError: {
      borderColor: '#ef4444'
    },
    inputSuccess: {
      borderColor: '#10b981'
    },
    passwordToggle: {
      position: 'absolute',
      right: '16px',
      background: 'transparent',
      border: 'none',
      color: currentTheme.textSecondary,
      cursor: 'pointer',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      transition: 'color 0.2s'
    },
    error: {
      fontSize: '13px',
      color: '#ef4444',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    rememberForgot: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '-8px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: currentTheme.text,
      cursor: 'pointer'
    },
    link: {
      color: currentTheme.accent,
      fontSize: '14px',
      textDecoration: 'none',
      fontWeight: '500',
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
      fontFamily: currentTheme.font,
      marginTop: '8px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
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
    socialButtons: {
      display: 'grid',
      gridTemplateColumns: socialProviders.length > 2 ? 'repeat(2, 1fr)' : '1fr',
      gap: '12px'
    },
    socialButton: {
      padding: '14px',
      fontSize: '15px',
      fontWeight: '600',
      color: currentTheme.text,
      background: 'rgba(255, 255, 255, 0.1)',
      border: `1.5px solid ${currentTheme.inputBorder}`,
      borderRadius: '12px',
      cursor: 'pointer',
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const inputVariants = {
    focus: {
      scale: 1.01,
      transition: { duration: 0.2 }
    },
    blur: {
      scale: 1,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      style={styles.container}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div style={styles.backgroundOverlay} />
      <div style={styles.decorativeCircle1} />
      <div style={styles.decorativeCircle2} />

      <motion.div
        style={styles.card}
        className="hover-lift"
        variants={cardVariants}
      >
        <div style={styles.header}>
          <motion.div
            style={styles.logo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {logo || '🔐'}
          </motion.div>
          <h1 style={styles.title}>Bienvenido</h1>
          <p style={styles.subtitle}>Inicia sesión para continuar</p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit(onSubmit)}>
          {/* Email Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <motion.div
              style={styles.inputContainer}
              variants={inputVariants}
              whileFocus="focus"
              animate="blur"
            >
              <FiMail style={styles.inputIcon} size={18} />
              <input
                {...register('email')}
                type="email"
                placeholder="tu@ejemplo.com"
                style={{
                  ...styles.input,
                  ...(errors.email ? styles.inputError : {}),
                  ...(touchedFields.email && !errors.email ? styles.inputSuccess : {})
                }}
                className={errors.email ? 'input-error' : ''}
              />
              {touchedFields.email && !errors.email && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ position: 'absolute', right: '16px', color: '#10b981' }}
                >
                  <FiCheckCircle size={18} />
                </motion.div>
              )}
            </motion.div>
            <AnimatePresence>
              {errors.email && (
                <motion.span
                  style={styles.error}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FiAlertCircle size={14} />
                  {errors.email.message}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Password Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <motion.div
              style={styles.inputContainer}
              variants={inputVariants}
              whileFocus="focus"
              animate="blur"
            >
              <FiLock style={styles.inputIcon} size={18} />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                style={{
                  ...styles.input,
                  paddingRight: '45px',
                  ...(errors.password ? styles.inputError : {}),
                  ...(touchedFields.password && !errors.password ? styles.inputSuccess : {})
                }}
                className={errors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </motion.div>
            <AnimatePresence>
              {errors.password && (
                <motion.span
                  style={styles.error}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FiAlertCircle size={14} />
                  {errors.password.message}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Remember Me & Forgot Password */}
          <div style={styles.rememberForgot}>
            {showRememberMe && (
              <label style={styles.checkbox} className="custom-checkbox">
                <input type="checkbox" {...register('rememberMe')} />
                <span>Recuérdame</span>
              </label>
            )}
            <a
              onClick={onForgotPassword}
              style={styles.link}
              className="hover-opacity"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            style={{
              ...styles.button,
              ...(isLoading || loginSuccess ? styles.buttonDisabled : {})
            }}
            disabled={isLoading || loginSuccess}
            className="hover-scale button-ripple"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <FiLoader className="spinner" size={18} />
                Iniciando sesión...
              </>
            ) : loginSuccess ? (
              <>
                <FiCheckCircle size={18} />
                ¡Acceso exitoso!
              </>
            ) : (
              'Iniciar sesión'
            )}
          </motion.button>
        </form>

        {/* Social Login */}
        {socialProviders && socialProviders.length > 0 && (
          <>
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>O CONTINUAR CON</span>
              <div style={styles.dividerLine} />
            </div>

            <div style={styles.socialButtons}>
              {socialProviders.map((provider) => (
                <motion.button
                  key={provider}
                  onClick={() => handleSocialLogin(provider)}
                  style={styles.socialButton}
                  className="hover-scale social-icon"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                >
                  {getSocialIcon(provider)}
                  {socialProviders.length <= 2 && getSocialName(provider)}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
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
      </motion.div>
    </motion.div>
  );
};

export default LoginImproved;
