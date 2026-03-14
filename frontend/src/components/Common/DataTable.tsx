/**
 * DataTable.tsx — Tabla genérica con skeleton shimmer y estado vacío mejorado.
 */

import React from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';
import { colors, radius } from '../../styles/colors';
import type { ColumnConfig } from './types';

// Estilos CSS inyectados una vez: shimmer + hovers con clases
const TABLE_STYLES = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .sk-cell {
    background: linear-gradient(90deg,
      var(--skeleton-from, #efefef) 25%,
      var(--skeleton-to,   #e2e2e2) 50%,
      var(--skeleton-from, #efefef) 75%
    );
    background-size: 600px 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    border-radius: 5px;
    display: block;
  }
  .tbl-row { transition: background 0.12s; }
  .tbl-row:hover { background: var(--row-hover, #f5f5f5) !important; }
  .tbl-row:hover .tbl-actions { opacity: 1 !important; }
  .tbl-actions { opacity: 0; transition: opacity 0.15s ease; }
  .btn-eye:hover, .btn-edit:hover {
    background: rgba(128,128,128,0.12) !important;
    border-color: rgba(128,128,128,0.30) !important;
  }
  .btn-del:hover {
    background: rgba(239,68,68,0.1) !important;
    border-color: rgba(239,68,68,0.35) !important;
  }
`;

interface Props<T extends { id: number }> {
  items:        T[];
  columns:      ColumnConfig<T>[];
  loading:      boolean;
  emptyIcon:    React.ReactNode;
  emptyMessage: string;
  onEdit:       (item: T) => void;
  onDelete:     (id: number) => void;
  onDetail?:    (item: T) => void;
}

const thStyle: React.CSSProperties = {
  padding: '13px 20px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.65px',
  background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
  borderBottom: `2px solid ${colors.border}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const tdStyle: React.CSSProperties = {
  padding: '15px 20px',
  fontSize: '14px',
  color: colors.textPrimary,
  borderBottom: `1px solid var(--border-light, #f0f0f4)`,
  verticalAlign: 'middle',
};

const tdMutedStyle: React.CSSProperties = {
  ...tdStyle,
  fontSize: '13px',
  color: colors.textMuted,
};

const actionBtnBase: React.CSSProperties = {
  width: '30px',
  height: '30px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.sm,
  border: `1px solid ${colors.border}`,
  background: colors.cardBg,
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
};

function DataTable<T extends { id: number }>({
  items, columns, loading,
  emptyIcon, emptyMessage,
  onEdit, onDelete, onDetail,
}: Props<T>) {
  const colCount = columns.length + 2; // +1 acciones, +1 número de fila

  return (
    <>
      <style>{TABLE_STYLES}</style>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>

          {/* ── Cabecera ─────────────────────────────────────────────────────── */}
          <thead>
            <tr>
              {/* Columna # */}
              <th style={{ ...thStyle, width: '48px', textAlign: 'center', paddingRight: '8px' }}>
                #
              </th>
              {columns.map(col => (
                <th key={col.key} style={thStyle}>{col.label}</th>
              ))}
              <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>

            {/* ── Skeleton shimmer ─────────────────────────────────────────── */}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`} style={{ background: i % 2 === 0 ? 'var(--row-bg, #fff)' : 'var(--row-bg-alt, #fcfcfd)' }}>
                {Array.from({ length: colCount }).map((__, j) => (
                  <td key={j} style={tdStyle}>
                    <span
                      className="sk-cell"
                      style={{
                        width: j === 0 ? '28px' : j === 1 ? '130px' : j % 3 === 0 ? '100px' : '75px',
                        height: '13px',
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* ── Estado vacío ─────────────────────────────────────────────── */}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={colCount}>
                  <div style={{ padding: '72px 24px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '80px', height: '80px',
                      borderRadius: '50%',
                      background: 'var(--th-bg, linear-gradient(135deg, #f0f0f0, #e8e8e8))',
                      color: colors.textMuted,
                      marginBottom: '20px',
                    }}>
                      {emptyIcon}
                    </div>
                    <p style={{ fontWeight: 700, color: colors.textSecondary, margin: '0 0 6px', fontSize: '15px' }}>
                      {emptyMessage}
                    </p>
                    <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                      Usa el botón <strong>+ Nuevo</strong> para agregar el primer registro.
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Filas de datos ───────────────────────────────────────────── */}
            {!loading && items.map((item, idx) => (
              <tr
                key={item.id}
                className="tbl-row"
                style={{ background: idx % 2 === 0 ? 'var(--row-bg, #ffffff)' : 'var(--row-bg-alt, #fafafc)' }}
              >
                {/* Número de fila */}
                <td style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted, fontSize: '12px', paddingRight: '8px', fontVariantNumeric: 'tabular-nums' }}>
                  {idx + 1}
                </td>

                {/* Celdas de datos */}
                {columns.map(col => (
                  <td key={col.key} style={col.muted ? tdMutedStyle : tdStyle}>
                    {col.render
                      ? col.render(item)
                      : (
                          String((item as Record<string, unknown>)[col.key] ?? '').trim() ||
                          <span style={{ color: '#d0d0d0' }}>—</span>
                        )
                    }
                  </td>
                ))}

                {/* Acciones */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div className="tbl-actions" style={{ display: 'inline-flex', gap: '6px' }}>
                    {onDetail && (
                      <button
                        className="btn-eye"
                        style={actionBtnBase}
                        title="Ver detalle"
                        onClick={() => onDetail(item)}
                      >
                        <Eye size={13} color={colors.textSecondary} />
                      </button>
                    )}
                    <button
                      className="btn-edit"
                      style={actionBtnBase}
                      title="Editar"
                      onClick={() => onEdit(item)}
                    >
                      <Edit2 size={13} color={colors.textSecondary} />
                    </button>
                    <button
                      className="btn-del"
                      style={actionBtnBase}
                      title="Eliminar"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 size={13} color={colors.danger} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </>
  );
}

export default DataTable;
