import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiRefreshCw,
  FiShield
} from 'react-icons/fi';
import { twoFactorSchema } from '../../schemas/authSchemas';
import { getTheme } from '../Login/themes';
import '../Login/styles.css';

/**
 * TwoFactorAuth Component - Verificación de código 2FA
 */
const TwoFactorAuth = ({
  theme = 'sunset',
  onVerify = async (code) => console.log('Verify code:', code),
  onResendCode = async () => console.log('Resend code'),
  email = 'usuario@ejemplo.com',
  logo = null,
  brandName = 'YourApp',
  backgroundImage = null,
  codeLength = 6
}) => {
  const [code, setCode] = useState(new Array(codeLength).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef([]);

  const currentTheme = getTheme(theme);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    setError('');

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit !== '') && index === codeLength - 1) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newCode = [...code];

      if (code[index]) {
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    }
    // Handle left/right arrow keys
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, codeLength);

    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    pastedData.split('').forEach((char, index) => {
      if (index < codeLength) {
        newCode[index] = char;
      }
    });
    setCode(newCode);

    // Focus last filled input or first empty input
    const lastFilledIndex = Math.min(pastedData.length, codeLength) - 1;
    inputRefs.current[lastFilledIndex]?.focus();

    // Auto-submit if all fields are filled
    if (newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleVerify = async (codeString) => {
    setIsLoading(true);
    setError('');

    try {
      await onVerify({ code: codeString });
      setVerifySuccess(true);
    } catch (err) {
      setError(err.message || 'Código inválido. Intenta de nuevo.');
      setCode(new Array(codeLength).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      await onResendCode();
      setResendCooldown(60); // 60 seconds cooldown
      setCode(new Array(codeLength).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Error al reenviar código');
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
      maxWidth: '480px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      position: 'relative',
      zIndex: 10
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px'
    },
    logo: {
      width: '80px',
      height: '80px',
      margin: '0 auto 20px',
      background: currentTheme.accent,
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '40px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: currentTheme.text,
      margin: '0 0 12px 0',
      letterSpacing: '-0.5px'
    },
    subtitle: {
      fontSize: '15px',
      color: currentTheme.textSecondary,
      margin: 0,
      fontWeight: '400',
      lineHeight: '1.6'
    },
    email: {
      color: currentTheme.accent,
      fontWeight: '600'
    },
    codeContainer: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      marginBottom: '24px'
    },
    codeInput: {
      width: '56px',
      height: '64px',
      fontSize: '24px',
      fontWeight: '700',
      textAlign: 'center',
      border: `2px solid ${currentTheme.inputBorder}`,
      borderRadius: '12px',
      background: currentTheme.inputBg,
      color: currentTheme.text,
      outline: 'none',
      transition: 'all 0.3s ease',
      fontFamily: currentTheme.font
    },
    codeInputFocus: {
      borderColor: currentTheme.accent,
      boxShadow: `0 0 0 3px ${currentTheme.accent}20`,
      transform: 'scale(1.05)'
    },
    codeInputError: {
      borderColor: '#ef4444',
      animation: 'shake 0.5s'
    },
    codeInputSuccess: {
      borderColor: '#10b981',
      background: 'rgba(16, 185, 129, 0.1)'
    },
    error: {
      fontSize: '14px',
      color: '#ef4444',
      marginTop: '16px',
      marginBottom: '16px',
      padding: '12px 16px',
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textAlign: 'center',
      justifyContent: 'center'
    },
    success: {
      fontSize: '14px',
      color: '#10b981',
      marginTop: '16px',
      marginBottom: '16px',
      padding: '12px 16px',
      background: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textAlign: 'center',
      justifyContent: 'center'
    },
    resendContainer: {
      textAlign: 'center',
      marginTop: '32px'
    },
    resendText: {
      fontSize: '14px',
      color: currentTheme.textSecondary,
      marginBottom: '12px'
    },
    resendButton: {
      background: 'transparent',
      border: 'none',
      color: currentTheme.accent,
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      padding: '8px 16px',
      borderRadius: '8px',
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    },
    resendButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    helper: {
      fontSize: '13px',
      color: currentTheme.textSecondary,
      textAlign: 'center',
      marginTop: '20px',
      lineHeight: '1.5'
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10
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
        {isLoading && (
          <div style={styles.loadingOverlay}>
            <FiLoader className="spinner" size={40} color="#fff" />
          </div>
        )}

        <div style={styles.header}>
          <motion.div
            style={styles.logo}
            animate={verifySuccess ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            {verifySuccess ? '✅' : (logo || <FiShield size={40} />)}
          </motion.div>
          <h1 style={styles.title}>
            {verifySuccess ? '¡Verificado!' : 'Verificación de dos factores'}
          </h1>
          <p style={styles.subtitle}>
            {verifySuccess
              ? 'Tu código ha sido verificado correctamente'
              : <>Ingresa el código de verificación enviado a <span style={styles.email}>{email}</span></>
            }
          </p>
        </div>

        {!verifySuccess && (
          <>
            <div style={styles.codeContainer}>
              {code.map((digit, index) => (
                <motion.input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.target.select()}
                  style={{
                    ...styles.codeInput,
                    ...(error ? styles.codeInputError : {}),
                    ...(digit && !error ? { borderColor: currentTheme.accent } : {})
                  }}
                  disabled={isLoading}
                  whileFocus={styles.codeInputFocus}
                  whileTap={{ scale: 0.95 }}
                />
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  style={styles.error}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FiAlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={styles.resendContainer}>
              <p style={styles.resendText}>¿No recibiste el código?</p>
              <motion.button
                onClick={handleResend}
                style={{
                  ...styles.resendButton,
                  ...(resendCooldown > 0 || isLoading ? styles.resendButtonDisabled : {})
                }}
                disabled={resendCooldown > 0 || isLoading}
                className="hover-opacity"
                whileHover={resendCooldown === 0 ? { scale: 1.05 } : {}}
                whileTap={resendCooldown === 0 ? { scale: 0.95 } : {}}
              >
                <FiRefreshCw size={16} />
                {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
              </motion.button>
            </div>

            <p style={styles.helper}>
              💡 El código expira en 10 minutos. Revisa también tu carpeta de spam.
            </p>
          </>
        )}

        {verifySuccess && (
          <motion.div
            style={styles.success}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <FiCheckCircle size={20} />
            Accediendo a tu cuenta...
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TwoFactorAuth;
