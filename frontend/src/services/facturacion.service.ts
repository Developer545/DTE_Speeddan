/**
 * facturacionService.ts - Servicios API para Facturación
 * Interactúa con el backend POS/Facturación
 */

import api from './api';

/** Línea de detalle para crear factura */
export interface LineaFactura {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;   // descuento por unidad ($) — montoDescu en DTE
  lote?: string | null;
}

export interface LoteDisponible {
  id: number;
  lote: string | null;
  cantidad: number;
  fecha_vencimiento: string | null;
  precio_unitario: number;
}

/**
 * Payload para crear factura.
 * Soporta los tres modos de receptor:
 *   A = Clientes Varios (anónimo)
 *   B = Datos transitorios (nombre + correo)
 *   C = Cliente registrado (cliente_id requerido)
 */
export interface CrearFacturaPayload {
  punto_venta_id: number;           // terminal que emite — define el correlativo DTE
  receptor_modo: 'A' | 'B' | 'C';
  cliente_id?: number;           // solo Modo C
  receptor_nombre?: string;           // solo Modo B
  receptor_correo?: string;           // solo Modo B
  // Override manual del tipo DTE (solo Modo C).
  tipo_dte_override?: 'DTE_01' | 'DTE_03' | 'DTE_11';
  retencion_renta?: number;           // ISR 1% — solo DTE_03 gran contribuyente
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';
  fecha_emision: string;
  fecha_vencimiento?: string;
  notas?: string;
  detalles: LineaFactura[];
}

export interface FacturaResponse {
  id: number;
  numero_dte: string;
  tipo_dte: 'DTE_01' | 'DTE_03' | 'DTE_05' | 'DTE_06' | 'DTE_11';
  factura: any;
  json_dte: any;
  json_pdf: any;
}

// Obtener lotes disponibles de un producto (GET /api/inventario/lotes/:productoId)
export async function getLotesPorProducto(productoId: number): Promise<LoteDisponible[]> {
  const response = await api.get(`/inventario/lotes/${productoId}`);
  return response.data;
}

// Crear factura (POST /api/facturas)
export async function crearFactura(
  payload: CrearFacturaPayload
): Promise<FacturaResponse> {
  const response = await api.post('/facturas', payload);
  return response.data;
}

// Listar facturas (GET /api/facturas)
export async function listarFacturas(
  search?: string,
  page?: number,
  limit?: number,
  fechaEmision?: string,
  puntoVentaId?: number
): Promise<any> {
  const params: any = {
    search: search || '',
    page: page || 1,
    limit: limit || 10,
  };
  if (fechaEmision) params.fecha_emision = fechaEmision;
  if (puntoVentaId) params.punto_venta_id = puntoVentaId;

  const response = await api.get('/facturas', { params });
  return response.data;
}

// Obtener factura (GET /api/facturas/:id)
export async function obtenerFactura(id: number): Promise<any> {
  const response = await api.get(`/facturas/${id}`);
  return response.data;
}

// Marcar como facturado (PUT /api/facturas/:id/marcar-facturado)
export async function marcarFacturado(id: number): Promise<any> {
  const response = await api.put(`/facturas/${id}/marcar-facturado`);
  return response.data;
}

// Cancelar factura (PUT /api/facturas/:id/cancelar)
export async function cancelarFactura(id: number): Promise<any> {
  const response = await api.put(`/facturas/${id}/cancelar`);
  return response.data;
}

// Crear devolución (POST /api/facturas/:id/devolucion)
export async function crearDevolucion(id: number): Promise<FacturaResponse> {
  const response = await api.post(`/facturas/${id}/devolucion`);
  return response.data;
}

// Descargar JSON para Hacienda (GET /api/facturas/:id/json-dte)
export async function descargarJsonDTE(id: number): Promise<void> {
  const factura = await obtenerFactura(id);
  const response = await api.get(`/facturas/${id}/json-dte`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${factura.numero_dte}_dte.json`);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
}

// Descargar JSON para PDF (GET /api/facturas/:id/json-pdf)
export async function descargarJsonPDF(id: number): Promise<void> {
  const factura = await obtenerFactura(id);
  const response = await api.get(`/facturas/${id}/json-pdf`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${factura.numero_dte}_pdf.json`);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
}

// Obtener JSON para visualización
export async function obtenerJsonDTE(id: number): Promise<any> {
  const response = await api.get(`/facturas/${id}/json-dte`);
  return response.data;
}

export async function obtenerJsonPDF(id: number): Promise<any> {
  const response = await api.get(`/facturas/${id}/json-pdf`);
  return response.data;
}
