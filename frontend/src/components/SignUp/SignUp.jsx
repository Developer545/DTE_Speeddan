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
  FiLoader,
  FiUser
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaGithub, FaTwitter } from 'react-icons/fa';
import { registerSchema } from '../../schemas/authSchemas';
import { getTheme } from '../Login/themes';
import '../Login/styles.css';

/**
 * SignUp Component - Registro de usuarios con validación completa
 */
const SignUp = ({
  theme = 'sunset',
  onRegister = async (data) => console.log('Register:', data),
  onSocialRegister = async (provider) => console.log('Social register:', provider),
  onLogin = () => console.log('Navigate to login'),
  logo = null,
  brandName = 'YourApp',
  socialProviders = ['google', 'facebook', 'github', 'twitter'],
  backgroundImage = null,
  requireTerms = true
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const currentTheme = getTheme(theme);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, touchedFields },
    watch
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onChange'
  });

  const password = watch('password', '');

  // Calculate password strength
  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: '', width: 0 };

    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score++;

    const width = (score / 5) * 100;

    if (score <= 2) return { score, text: 'Débil', color: '#ef4444', width };
    if (score <= 3) return { score, text: 'Media', color: '#f59e0b', width };
    return { score, text: 'Fuerte', color: '#10b981', width };
  };

  const passwordStrength = calculatePasswordStrength(password);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onRegister(data);
      setRegisterSuccess(true);
      setTimeout(() => {
        setRegisterSuccess(false);
        onLogin(); // Navigate to login after successful registration
      }, 2000);
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = async (provider) => {
    setIsLoading(true);
    try {
      await onSocialRegister(provider);
    } catch (error) {
      console.error('Social register error:', error);
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
      padding: '40px 20px',
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
      padding: '40px 40px 48px',
      width: '100%',
      maxWidth: '500px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      position: 'relative',
      zIndex: 10
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    logo: {
      width: '64px',
      height: '64px',
      margin: '0 auto 16px',
      background: currentTheme.accent,
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px'
    },
    title: {
      fontSize: '28px',
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
      gap: '18px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: currentTheme.text,
      marginBottom: '2px'
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
      fontSize: '12px',
      color: '#ef4444',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    passwordStrengthBar: {
      height: '4px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      marginTop: '8px',
      overflow: 'hidden'
    },
    passwordStrengthFill: {
      height: '100%',
      borderRadius: '2px',
      transition: 'all 0.3s ease',
      background: passwordStrength.color,
      width: `${passwordStrength.width}%`
    },
    passwordStrengthText: {
      fontSize: '12px',
      color: currentTheme.textSecondary,
      marginTop: '6px',
      display: 'block'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      fontSize: '13px',
      color: currentTheme.text,
      cursor: 'pointer',
      marginTop: '4px'
    },
    checkboxInput: {
      marginTop: '2px',
      cursor: 'pointer'
    },
    link: {
      color: currentTheme.accent,
      textDecoration: 'none',
      fontWeight: '500'
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
      margin: '24px 0 20px'
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: currentTheme.inputBorder
    },
    dividerText: {
      fontSize: '12px',
      color: currentTheme.textSecondary,
      fontWeight: '500'
    },
    socialButtons: {
      display: 'grid',
      gridTemplateColumns: socialProviders.length > 2 ? 'repeat(2, 1fr)' : '1fr',
      gap: '12px'
    },
    socialButton: {
      padding: '12px',
      fontSize: '14px',
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
      gap: '10px'
    },
    footer: {
      textAlign: 'center',
      marginTop: '24px'
    },
    footerText: {
      fontSize: '14px',
      color: currentTheme.textSecondary,
      margin: 0
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div style={styles.backgroundOverlay} />
      <div style={styles.decorativeCircle1} />
      <div style={styles.decorativeCircle2} />

      <motion.div
        style={styles.card}
        className="hover-lift"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div style={styles.header}>
          <motion.div
            style={styles.logo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {logo || '📝'}
          </motion.div>
          <h1 style={styles.title}>Crear cuenta</h1>
          <p style={styles.subtitle}>Completa el formulario para registrarte</p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit(onSubmit)}>
          {/* Name Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nombre completo</label>
            <div style={styles.inputContainer}>
              <FiUser style={styles.inputIcon} size={18} />
              <input
                {...registerField('name')}
                type="text"
                placeholder="Juan Pérez"
                style={{
                  ...styles.input,
                  ...(errors.name ? styles.inputError : {}),
                  ...(touchedFields.name && !errors.name ? styles.inputSuccess : {})
                }}
                className={errors.name ? 'input-error' : ''}
              />
              {touchedFields.name && !errors.name && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ position: 'absolute', right: '16px', color: '#10b981' }}
                >
                  <FiCheckCircle size={18} />
                </motion.div>
              )}
            </div>
            <AnimatePresence>
              {errors.name && (
                <motion.span
                  style={styles.error}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FiAlertCircle size={12} />
                  {errors.name.message}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Email Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <div style={styles.inputContainer}>
              <FiMail style={styles.inputIcon} size={18} />
              <input
                {...registerField('email')}
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
            </div>
            <AnimatePresence>
              {errors.email && (
                <motion.span
                  style={styles.error}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FiAlertCircle size={12} />
                  {errors.email.message}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Password Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.inputContainer}>
              <FiLock style={styles.inputIcon} size={18} />
              <input
                {...registerField('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
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
            </div>
            {password && (
              <div style={styles.passwordStrengthBar}>
                <div style={styles.passwordStrengthFill} />
              </div>
            )}
            {password && (
              <span style={{...styles.passwordStrengthText, color: passwordStrength.color}}>
                Fortaleza: {passwordStrength.text}
              </span>
            )}
            <AnimatePresence>
              {errors.password && (
                <motion.span
                  style={styles.error}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FiAlertCircle size={12} />
                  {errors.password.message}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Confirm Password Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirmar contraseña</label>
            <div style={styles.inputContainer}>
              <FiLock style={styles.inputIcon} size={18} />
              <input
                {...registerField('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repite tu contraseña"
                style={{
                  ...styles.input,
                  paddingRight: '45px',
                  ...(errors.confirmPassword ? styles.inputError : {}),
                  ...(touchedFields.confirmPassword && !errors.confirmPassword ? styles.inputSuccess : {})
                }}
                className={errors.confirmPassword ? 'input-error' : ''}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.confirmPassword && (
                <motion.span
                  style={styles.error}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FiAlertCircle size={12} />
                  {errors.confirmPassword.message}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Terms & Conditions */}
          {requireTerms && (
            <div style={styles.inputGroup}>
              <label style={styles.checkbox} className="custom-checkbox">
                <input
                  {...registerField('termsAccepted')}
                  type="checkbox"
                  style={styles.checkboxInput}
                />
                <span>
                  Acepto los{' '}
                  <a href="#" style={styles.link} className="hover-opacity">
                    términos y condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="#" style={styles.link} className="hover-opacity">
                    política de privacidad
                  </a>
                </span>
              </label>
              <AnimatePresence>
                {errors.termsAccepted && (
                  <motion.span
                    style={styles.error}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <FiAlertCircle size={12} />
                    {errors.termsAccepted.message}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            style={{
              ...styles.button,
              ...(isLoading || registerSuccess ? styles.buttonDisabled : {})
            }}
            disabled={isLoading || registerSuccess}
            className="hover-scale button-ripple"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <FiLoader className="spinner" size={18} />
                Creando cuenta...
              </>
            ) : registerSuccess ? (
              <>
                <FiCheckCircle size={18} />
                ¡Cuenta creada!
              </>
            ) : (
              'Crear cuenta'
            )}
          </motion.button>
        </form>

        {/* Social Register */}
        {socialProviders && socialProviders.length > 0 && (
          <>
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>O REGÍSTRATE CON</span>
              <div style={styles.dividerLine} />
            </div>

            <div style={styles.socialButtons}>
              {socialProviders.map((provider) => (
                <motion.button
                  key={provider}
                  onClick={() => handleSocialRegister(provider)}
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
            ¿Ya tienes cuenta?{' '}
            <a
              onClick={onLogin}
              style={styles.link}
              className="hover-opacity"
            >
              Inicia sesión
            </a>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SignUp;
