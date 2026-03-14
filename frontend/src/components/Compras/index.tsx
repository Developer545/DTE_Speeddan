/**
 * Compras/index.tsx — Página de Compras.
 * Tabla plana: una fila por línea de compra (producto).
 * El botón 👁 abre el detalle completo de la orden.
 * El botón 🗑 elimina toda la orden de compra.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Eye, Trash2, Receipt, X } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { comprasService } from '../../services/compras.service';
import { CompraLineaRow, CompraConDetalle, CreateCompraDTO } from '../../types/compra.types';
import { COLUMNS, PAGE_TITLE, SEARCH_PLACEHOLDER } from './config';
import { CompraForm } from './CompraForm';
import SearchBar     from '../Common/SearchBar';
import Pagination    from '../Common/Pagination';
import { notify }   from '../../utils/notify';
import ConfirmDialog from '../Common/ConfirmDialog';

const PAGE_LIMIT = 10;

const fmtDateLong = new Intl.DateTimeFormat('es-SV', {
  year: 'numeric', month: 'long', day: 'numeric',
});
const fmtCur = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });

export function ComprasList() {
  const [items,      setItems]      = useState<CompraLineaRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(PAGE_LIMIT);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(false);

  const [showForm,      setShowForm]      = useState(false);
  const [formLoading,   setFormLoading]   = useState(false);
  const [deletingId,    setDeletingId]    = useState<number | null>(null);
  const [delLoading,    setDelLoading]    = useState(false);
  const [detailItem,    setDetailItem]    = useState<CompraConDetalle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async (p: number, lim: number, q: string) => {
    setLoading(true);
    try {
      const res = await comprasService.getAll({ search: q, page: p, limit: lim });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      notify.error('Error al cargar compras', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(page, limit, search); }, [page, limit, search, fetchData]);

  const handleCreate = async (dto: CreateCompraDTO) => {
    setFormLoading(true);
    try {
      await comprasService.create(dto);
      setShowForm(false);
      setPage(1);
      fetchData(1, limit, search);
      notify.success('Compra registrada');
    } catch (err: any) {
      notify.error('Error al registrar compra', err?.response?.data?.message ?? err?.message);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    setDelLoading(true);
    try {
      await comprasService.delete(deletingId);
      setDeletingId(null);
      fetchData(page, limit, search);
      notify.success('Compra eliminada');
    } catch (err: any) {
      notify.error('Error al eliminar', err.message);
      setDeletingId(null);
    } finally {
      setDelLoading(false);
    }
  };

  const handleOpenDetail = async (compraId: number) => {
    setDetailLoading(true);
    try {
      const detail = await comprasService.getById(compraId);
      setDetailItem(detail);
    } catch (err: any) {
      notify.error('Error al cargar detalle', err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  const subtitle = search
    ? `${total} resultado${total !== 1 ? 's' : ''} para "${search}"`
    : `${total} línea${total !== 1 ? 's' : ''} de compra`;

  // ── Estilos ────────────────────────────────────────────────────────────────
  const tdStyle: React.CSSProperties = {
    padding: '11px 14px',
    fontSize: '13px',
    color: colors.textPrimary,
    borderBottom: `1px solid ${colors.borderLight}`,
    verticalAlign: 'middle',
  };
  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    textAlign: 'left',
    background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
    borderBottom: `2px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };
  const actionBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '5px', borderRadius: radius.sm,
    display: 'flex', alignItems: 'center',
  };

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '22px', borderRadius: '4px', background: colors.accent }} />
          <h1 style={{ fontSize: '21px', fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px', margin: 0 }}>
            {PAGE_TITLE}
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 0 14px' }}>
          {subtitle}
        </p>
      </div>

      {/* Tarjeta */}
      <div style={{
        background: colors.cardBg,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${colors.border}`,
          gap: '16px', flexWrap: 'wrap',
          background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
        }}>
          <SearchBar value={search} onChange={handleSearch} placeholder={SEARCH_PLACEHOLDER} />
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 20px',
              background: colors.accent, color: colors.accentText,
              border: 'none', borderRadius: radius.md,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            <Plus size={15} /> Nueva Compra
          </button>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '44px', textAlign: 'center' }}>N°</th>
                {COLUMNS.map(col => (
                  <th key={col.key} style={thStyle}>{col.label}</th>
                ))}
                <th style={{ ...thStyle, textAlign: 'center', width: '80px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted, padding: '48px' }}>
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} style={{ ...tdStyle, textAlign: 'center', padding: '64px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: colors.textMuted }}>
                      <Receipt size={48} />
                      <span style={{ fontSize: '14px' }}>
                        {search ? 'No se encontraron compras' : 'No hay compras registradas'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && items.map((item, idx) => (
                <tr
                  key={item.detalle_id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* N° */}
                  <td style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted, fontSize: '12px' }}>
                    {(page - 1) * limit + idx + 1}
                  </td>

                  {/* Columnas dinámicas */}
                  {COLUMNS.map(col => (
                    <td key={col.key} style={tdStyle}>
                      {col.render(item)}
                    </td>
                  ))}

                  {/* Acciones */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        style={{ ...actionBtn, color: colors.textSecondary }}
                        title="Ver detalle de la orden"
                        onClick={() => handleOpenDetail(item.compra_id)}
                        disabled={detailLoading}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        style={{ ...actionBtn, color: colors.danger }}
                        title={`Eliminar orden ${item.orden_compra}`}
                        onClick={() => setDeletingId(item.compra_id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      </div>

      {/* Modal: Nueva Compra */}
      {showForm && (
        <CompraForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          loading={formLoading}
        />
      )}

      {/* Modal: Confirmar eliminación */}
      {deletingId !== null && (
        <ConfirmDialog
          title={`¿Eliminar orden ${items.find(i => i.compra_id === deletingId)?.orden_compra ?? ''}?`}
          message="Se eliminarán todas las líneas de esta orden. El inventario no se revertirá."
          loading={delLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Modal: Detalle de compra */}
      {detailItem && (
        <CompraDetailModal
          compra={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

// ── Modal de detalle ────────────────────────────────────────────────────────

function CompraDetailModal({
  compra,
  onClose,
}: {
  compra: CompraConDetalle;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: colors.cardBg,
        borderRadius: radius.xl,
        boxShadow: shadow.modal,
        width: '100%',
        maxWidth: '720px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '4px', height: '20px', borderRadius: '4px', background: colors.accent }} />
              <span style={{
                fontFamily: 'monospace', fontWeight: 700, fontSize: '15px',
                background: colors.inputBg, padding: '3px 10px', borderRadius: '6px',
                letterSpacing: '0.5px', color: colors.textPrimary,
              }}>
                {compra.orden_compra}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: colors.textMuted, marginLeft: '14px' }}>
              <span style={{ fontWeight: 600, color: colors.textSecondary }}>{compra.proveedor_nombre}</span>
              {' · '}
              {fmtDateLong.format(new Date(compra.fecha_compra))}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '2px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {compra.notas && (
            <div style={{
              background: colors.mutedBg, borderRadius: radius.sm,
              padding: '10px 14px', marginBottom: '16px',
              fontSize: '13px', color: colors.textSecondary,
              border: `1px solid ${colors.borderLight}`,
            }}>
              <strong>Notas:</strong> {compra.notas}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Producto', 'Lote', 'Vencimiento', 'Cant.', 'Precio/u', 'Subtotal'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', fontSize: '11px', fontWeight: 600,
                    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px',
                    background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))', borderBottom: `2px solid ${colors.border}`,
                    textAlign: h === '#' ? 'center' : 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compra.lineas.map((l, idx) => (
                <tr key={l.id}>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: colors.textMuted, textAlign: 'center', borderBottom: `1px solid ${colors.borderLight}` }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500, borderBottom: `1px solid ${colors.borderLight}` }}>
                    {l.producto_nombre}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', color: colors.textMuted, borderBottom: `1px solid ${colors.borderLight}` }}>
                    {l.lote ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: colors.textMuted, borderBottom: `1px solid ${colors.borderLight}` }}>
                    {l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString('es-SV') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, borderBottom: `1px solid ${colors.borderLight}` }}>
                    {Number(l.cantidad)}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', borderBottom: `1px solid ${colors.borderLight}` }}>
                    {fmtCur.format(Number(l.precio_unitario))}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, borderBottom: `1px solid ${colors.borderLight}` }}>
                    {fmtCur.format(Number(l.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${colors.border}`,
          background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>
            TOTAL: {fmtCur.format(Number(compra.total))}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              background: colors.accent, color: colors.accentText,
              border: 'none', borderRadius: radius.md,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ComprasList;
