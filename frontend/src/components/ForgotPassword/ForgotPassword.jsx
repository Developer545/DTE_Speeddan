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
  FiArrowLeft,
  FiKey
} from 'react-icons/fi';
import { forgotPasswordSchema, resetPasswordSchema } from '../../schemas/authSchemas';
import { getTheme } from '../Login/themes';
import '../Login/styles.css';

/**
 * ForgotPassword Component - Recuperación de contraseña en 2 pasos
 */
const ForgotPassword = ({
  theme = 'sunset',
  onRequestReset = async (email) => console.log('Request reset:', email),
  onResetPassword = async (data) => console.log('Reset password:', data),
  onBack = () => console.log('Navigate back to login'),
  logo = null,
  brandName = 'YourApp',
  backgroundImage = null
}) => {
  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset Password
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const currentTheme = getTheme(theme);

  // Step 1: Request Reset Code
  const {
    register: registerEmailField,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, touchedFields: emailTouched }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange'
  });

  // Step 2: Reset Password
  const {
    register: registerResetField,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors, touchedFields: resetTouched },
    watch
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
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

  const onRequestSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onRequestReset(data.email);
      setEmail(data.email);
      setStep(2);
    } catch (error) {
      console.error('Request reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onResetPassword({ ...data, email });
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        onBack();
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
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
    backButton: {
      position: 'absolute',
      top: '24px',
      left: '24px',
      background: 'transparent',
      border: 'none',
      color: currentTheme.text,
      cursor: 'pointer',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'opacity 0.2s'
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
      fontWeight: '400',
      lineHeight: '1.5'
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    infoBox: {
      background: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '8px'
    },
    infoText: {
      fontSize: '13px',
      color: currentTheme.textSecondary,
      margin: 0,
      lineHeight: '1.5'
    },
    codeHint: {
      fontSize: '12px',
      color: currentTheme.textSecondary,
      marginTop: '8px',
      fontStyle: 'italic'
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

  const stepVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
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
        <motion.button
          style={styles.backButton}
          onClick={onBack}
          className="hover-opacity"
          whileHover={{ x: -4 }}
        >
          <FiArrowLeft size={18} />
          Volver
        </motion.button>

        <div style={styles.header}>
          <motion.div
            style={styles.logo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {logo || '🔑'}
          </motion.div>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 style={styles.title}>¿Olvidaste tu contraseña?</h1>
                <p style={styles.subtitle}>
                  Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="step2-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 style={styles.title}>Restablecer contraseña</h1>
                <p style={styles.subtitle}>
                  Ingresa el código que enviamos a {email} y tu nueva contraseña
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" custom={step}>
          {step === 1 ? (
            <motion.form
              key="step1-form"
              style={styles.form}
              onSubmit={handleEmailSubmit(onRequestSubmit)}
              custom={1}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div style={styles.inputGroup}>
                <label style={styles.label}>Correo electrónico</label>
                <div style={styles.inputContainer}>
                  <FiMail style={styles.inputIcon} size={18} />
                  <input
                    {...registerEmailField('email')}
                    type="email"
                    placeholder="tu@ejemplo.com"
                    style={{
                      ...styles.input,
                      ...(emailErrors.email ? styles.inputError : {}),
                      ...(emailTouched.email && !emailErrors.email ? styles.inputSuccess : {})
                    }}
                    className={emailErrors.email ? 'input-error' : ''}
                  />
                  {emailTouched.email && !emailErrors.email && (
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
                  {emailErrors.email && (
                    <motion.span
                      style={styles.error}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <FiAlertCircle size={14} />
                      {emailErrors.email.message}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div style={styles.infoBox}>
                <p style={styles.infoText}>
                  📧 Recibirás un código de verificación en tu correo electrónico. El código expira en 15 minutos.
                </p>
              </div>

              <motion.button
                type="submit"
                style={{
                  ...styles.button,
                  ...(isLoading ? styles.buttonDisabled : {})
                }}
                disabled={isLoading}
                className="hover-scale button-ripple"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <FiLoader className="spinner" size={18} />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <FiMail size={18} />
                    Enviar código
                  </>
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="step2-form"
              style={styles.form}
              onSubmit={handleResetSubmit(onResetSubmit)}
              custom={2}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div style={styles.inputGroup}>
                <label style={styles.label}>Código de verificación</label>
                <div style={styles.inputContainer}>
                  <FiKey style={styles.inputIcon} size={18} />
                  <input
                    {...registerResetField('code')}
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    style={{
                      ...styles.input,
                      letterSpacing: '0.5em',
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '18px',
                      ...(resetErrors.code ? styles.inputError : {}),
                      ...(resetTouched.code && !resetErrors.code ? styles.inputSuccess : {})
                    }}
                    className={resetErrors.code ? 'input-error' : ''}
                  />
                </div>
                <p style={styles.codeHint}>Revisa tu correo electrónico</p>
                <AnimatePresence>
                  {resetErrors.code && (
                    <motion.span
                      style={styles.error}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <FiAlertCircle size={14} />
                      {resetErrors.code.message}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nueva contraseña</label>
                <div style={styles.inputContainer}>
                  <FiLock style={styles.inputIcon} size={18} />
                  <input
                    {...registerResetField('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    style={{
                      ...styles.input,
                      paddingRight: '45px',
                      ...(resetErrors.password ? styles.inputError : {}),
                      ...(resetTouched.password && !resetErrors.password ? styles.inputSuccess : {})
                    }}
                    className={resetErrors.password ? 'input-error' : ''}
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
                  {resetErrors.password && (
                    <motion.span
                      style={styles.error}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <FiAlertCircle size={14} />
                      {resetErrors.password.message}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar nueva contraseña</label>
                <div style={styles.inputContainer}>
                  <FiLock style={styles.inputIcon} size={18} />
                  <input
                    {...registerResetField('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    style={{
                      ...styles.input,
                      paddingRight: '45px',
                      ...(resetErrors.confirmPassword ? styles.inputError : {}),
                      ...(resetTouched.confirmPassword && !resetErrors.confirmPassword ? styles.inputSuccess : {})
                    }}
                    className={resetErrors.confirmPassword ? 'input-error' : ''}
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
                  {resetErrors.confirmPassword && (
                    <motion.span
                      style={styles.error}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <FiAlertCircle size={14} />
                      {resetErrors.confirmPassword.message}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                type="submit"
                style={{
                  ...styles.button,
                  ...(isLoading || resetSuccess ? styles.buttonDisabled : {})
                }}
                disabled={isLoading || resetSuccess}
                className="hover-scale button-ripple"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <FiLoader className="spinner" size={18} />
                    Restableciendo...
                  </>
                ) : resetSuccess ? (
                  <>
                    <FiCheckCircle size={18} />
                    ¡Contraseña actualizada!
                  </>
                ) : (
                  <>
                    <FiLock size={18} />
                    Restablecer contraseña
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default ForgotPassword;
