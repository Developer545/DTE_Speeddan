import React from 'react';
import { AlertCircle } from 'lucide-react';
import { colors } from '../../styles/colors';

interface Props {
  message: string;
}

const ErrorBanner: React.FC<Props> = ({ message }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '14px 24px',
    background: colors.dangerBg,
    borderBottom: `1px solid ${colors.dangerBorder}`,
    color: colors.dangerText,
    fontSize: '14px',
  }}>
    <AlertCircle size={16} />
    {message}
  </div>
);

export default ErrorBanner;
