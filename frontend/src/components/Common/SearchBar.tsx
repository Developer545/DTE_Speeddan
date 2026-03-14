import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { colors, radius } from '../../styles/colors';

interface Props {
  value:        string;
  onChange:     (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<Props> = ({ value, onChange, placeholder = 'Buscar...' }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
      <Search
        size={15}
        style={{
          position: 'absolute', left: '13px',
          top: '50%', transform: 'translateY(-50%)',
          color: focused ? colors.textPrimary : colors.textMuted,
          pointerEvents: 'none',
          transition: 'color 0.15s',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 14px 9px 38px',
          border: focused
            ? `1.5px solid rgba(0,0,0,0.4)`
            : `1.5px solid ${colors.border}`,
          borderRadius: radius.md,
          fontSize: '14px',
          color: colors.textPrimary,
          background: focused ? colors.cardBg : colors.pageBg,
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 3px rgba(0,0,0,0.07)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        }}
      />
    </div>
  );
};

export default SearchBar;
