/**
 * CompraForm.tsx — Modal personalizado para crear una compra.
 * Incluye header (proveedor, fecha, notas) y tabla dinámica de líneas.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { Proveedor } from '../../types/proveedor.types';
import { Producto } from '../../types/producto.types';
import { CreateCompraDTO, CreateCompraDetalleDTO } from '../../types/compra.types';
import { proveedoresService } from '../../services/proveedores.service';
import { productosService } from '../../services/productos.service';

interface Props {
  onSubmit: (dto: CreateCompraDTO) => Promise<void>;
  onClose:  () => void;
  loading:  boolean;
}

interface LineaForm {
  producto_id:        string;
  cantidad:           string;
  lote:               string;
  fecha_vencimiento:  string;
  precio_unitario:    string;
}

const emptyLinea = (): LineaForm => ({
  producto_id:       '',
  cantidad:          '1',
  lote:              '',
  fecha_vencimiento: '',
  precio_unitario:   '0',
});

const fmtCurrency = new Intl.NumberFormat('es-SV', {
  style: 'currency', currency: 'USD',
});

export function CompraForm({ onSubmit, onClose, loading }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos,   setProductos]   = useState<Producto[]>([]);

  const [ordenCompra,  setOrdenCompra]  = useState('');
  const [proveedorId,  setProveedorId]  = useState('');
  const [fechaCompra,  setFechaCompra]  = useState(new Date().toISOString().split('T')[0]);
  const [notas,        setNotas]        = useState('');
  const [lineas,       setLineas]       = useState<LineaForm[]>([emptyLinea()]);
  const [errors,       setErrors]       = useState<string[]>([]);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    proveedoresService.getAll({ limit: 200 }).then(r => setProveedores(r.data)).catch(() => {});
    productosService.getAll({ limit: 500 }).then(r => setProductos(r.data)).catch(() => {});
  }, []);

  const addLinea = () => setLineas(prev => [...prev, emptyLinea()]);

  const removeLinea = (idx: number) =>
    setLineas(prev => prev.filter((_, i) => i !== idx));

  const updateLinea = (idx: number, field: keyof LineaForm, value: string) =>
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const total = lineas.reduce((sum, l) => {
    const qty = parseFloat(l.cantidad) || 0;
    const pu  = parseFloat(l.precio_unitario) || 0;
    return sum + qty * pu;
  }, 0);

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!ordenCompra.trim()) errs.push('El número de orden de compra es obligatorio');
    if (!proveedorId) errs.push('Selecciona un proveedor');
    if (!fechaCompra) errs.push('Selecciona una fecha');
    if (lineas.length === 0) errs.push('Agrega al menos un producto');
    lineas.forEach((l, i) => {
      if (!l.producto_id) errs.push(`Línea ${i + 1}: selecciona un producto`);
      if (!l.cantidad || parseFloat(l.cantidad) <= 0) errs.push(`Línea ${i + 1}: cantidad inválida`);
      if (!l.precio_unitario || parseFloat(l.precio_unitario) < 0) errs.push(`Línea ${i + 1}: precio inválido`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dto: CreateCompraDTO = {
      orden_compra: ordenCompra.trim(),
      proveedor_id: parseInt(proveedorId, 10),
      fecha_compra: fechaCompra,
      notas:        notas || undefined,
      lineas: lineas.map(l => ({
        producto_id:       parseInt(l.producto_id, 10),
        cantidad:          parseFloat(l.cantidad),
        lote:              l.lote || undefined,
        fecha_vencimiento: l.fecha_vencimiento || undefined,
        precio_unitario:   parseFloat(l.precio_unitario),
      } as CreateCompraDetalleDTO)),
    };
    try {
      await onSubmit(dto);
    } catch (err: any) {
      setErrors([err.message || 'Error al guardar la compra']);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // ── Estilos ────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: '13px',
    color: colors.textPrimary,
    background: colors.inputBg,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: '5px',
    display: 'block',
  };

  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
    borderBottom: `2px solid ${colors.border}`,
    textAlign: 'left',
  };

  const tdStyle: React.CSSProperties = {
    padding: '6px 8px',
    verticalAlign: 'middle',
    borderBottom: `1px solid ${colors.borderLight}`,
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
        maxWidth: '860px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header del modal */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '22px', borderRadius: '4px', background: colors.accent }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: colors.textPrimary }}>
              Nueva Compra
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textMuted, padding: '4px',
              borderRadius: radius.sm,
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body scrollable */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', flex: 1 }}>

            {/* Errores */}
            {errors.length > 0 && (
              <div style={{
                background: colors.dangerBg,
                border: `1px solid ${colors.dangerBorder}`,
                borderRadius: radius.sm,
                padding: '12px 16px',
                marginBottom: '16px',
              }}>
                {errors.map((e, i) => (
                  <div key={i} style={{ fontSize: '13px', color: colors.dangerText, marginBottom: i < errors.length - 1 ? '4px' : 0 }}>
                    • {e}
                  </div>
                ))}
              </div>
            )}

            {/* Campos del header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* N° Orden de Compra — full width, primer campo */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>N° Orden de Compra *</label>
                <input
                  type="text"
                  value={ordenCompra}
                  onChange={e => setOrdenCompra(e.target.value)}
                  placeholder="Ej: OC-0001, 2025-001, FAC-123..."
                  style={{
                    ...inputStyle,
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                  autoFocus
                />
              </div>
              {/* Proveedor */}
              <div>
                <label style={labelStyle}>Proveedor *</label>
                <select
                  value={proveedorId}
                  onChange={e => setProveedorId(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              {/* Fecha */}
              <div>
                <label style={labelStyle}>Fecha de compra *</label>
                <input
                  type="date"
                  value={fechaCompra}
                  onChange={e => setFechaCompra(e.target.value)}
                  style={inputStyle}
                />
              </div>
              {/* Notas (full width) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notas</label>
                <input
                  type="text"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Observaciones opcionales..."
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Sección de productos */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Productos
              </span>
              <button
                type="button"
                onClick={addLinea}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: colors.accent, color: colors.accentText,
                  border: 'none', borderRadius: radius.sm,
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Agregar
              </button>
            </div>

            {/* Tabla de líneas */}
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '28%' }}>Producto *</th>
                    <th style={{ ...thStyle, width: '10%' }}>Cantidad *</th>
                    <th style={{ ...thStyle, width: '14%' }}>Lote</th>
                    <th style={{ ...thStyle, width: '16%' }}>Vencimiento</th>
                    <th style={{ ...thStyle, width: '14%' }}>Precio/u *</th>
                    <th style={{ ...thStyle, width: '12%' }}>Subtotal</th>
                    <th style={{ ...thStyle, width: '6%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, idx) => {
                    const subtotal = (parseFloat(linea.cantidad) || 0) * (parseFloat(linea.precio_unitario) || 0);
                    return (
                      <tr key={idx}>
                        <td style={tdStyle}>
                          <select
                            value={linea.producto_id}
                            onChange={e => updateLinea(idx, 'producto_id', e.target.value)}
                            style={{ ...inputStyle, padding: '6px 8px' }}
                          >
                            <option value="">Seleccionar...</option>
                            {productos.map(p => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={linea.cantidad}
                            onChange={e => updateLinea(idx, 'cantidad', e.target.value)}
                            style={{ ...inputStyle, padding: '6px 8px' }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="text"
                            value={linea.lote}
                            onChange={e => updateLinea(idx, 'lote', e.target.value)}
                            placeholder="L001"
                            style={{ ...inputStyle, padding: '6px 8px' }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="date"
                            value={linea.fecha_vencimiento}
                            onChange={e => updateLinea(idx, 'fecha_vencimiento', e.target.value)}
                            style={{ ...inputStyle, padding: '6px 8px' }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.precio_unitario}
                            onChange={e => updateLinea(idx, 'precio_unitario', e.target.value)}
                            style={{ ...inputStyle, padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ ...tdStyle, fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>
                          ${subtotal.toFixed(2)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {lineas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLinea(idx)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: colors.danger, padding: '4px',
                                display: 'flex', alignItems: 'center',
                              }}
                              title="Eliminar línea"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer fijo con total y botones */}
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${colors.border}`,
            background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>
              TOTAL: {fmtCurrency.format(total)}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  background: colors.inputBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '14px', fontWeight: 600,
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  background: loading ? '#444' : colors.accent,
                  color: colors.accentText,
                  border: 'none',
                  borderRadius: radius.md,
                  fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Guardando...' : 'Guardar Compra'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CompraForm;
