import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { colors, radius } from '../../styles/colors';

export const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

interface Props {
  page:       number;
  totalPages: number;
  total:      number;
  limit:      number;
  onPageChange:  (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const btnBase: React.CSSProperties = {
  width: '32px', height: '32px',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  background: colors.cardBg,
  cursor: 'pointer', fontSize: '13px', fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  border: `1px solid ${colors.accent}`,
  background: colors.accent,
  color: colors.accentText,
  fontWeight: 700,
};

const Pagination: React.FC<Props> = ({
  page, totalPages, total, limit,
  onPageChange, onLimitChange,
}) => {
  const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow   = Math.min(page * limit, total);

  // Muestra hasta 5 botones centrados alrededor de la página actual
  const pageButtons: number[] = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pageButtons.push(i);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', borderTop: `1px solid ${colors.border}`,
      flexWrap: 'wrap', gap: '12px',
    }}>
      {/* Selector de filas por página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>
          Filas por página:
        </span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          style={{
            padding: '6px 10px',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            fontSize: '13px', background: colors.cardBg,
            color: colors.textSecondary, cursor: 'pointer',
          }}
        >
          {LIMIT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>
          {startRow}–{endRow} de {total}
        </span>
      </div>

      {/* Botones de página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          style={btnBase}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft size={16} />
        </button>

        {pageButtons.map(p => (
          <button
            key={p}
            style={p === page ? btnActive : btnBase}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          style={btnBase}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
