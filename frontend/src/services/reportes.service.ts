/**
 * reportes.service.ts — Funciones de API para el módulo de Reportes.
 */

import api from './api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ResumenVentas {
  total_facturas:  number;
  total_ventas:    number;
  total_iva:       number;
  total_retencion: number;
}

export interface FilaFactura {
  id:              number;
  numero_dte:      string;
  tipo_dte:        string;
  fecha_emision:   string;
  estado:          string;
  subtotal:        number;
  iva:             number;
  retencion_renta: number;
  total:           number;
  cliente:         string;
}

export interface VentasResponse {
  periodo:  { inicio: string; fin: string };
  resumen:  ResumenVentas;
  facturas: FilaFactura[];
}

export interface TopCliente {
  cliente:        string;
  total_facturas: number;
  total_monto:    number;
}

export interface TopProducto {
  producto:       string;
  total_cantidad: number;
  total_monto:    number;
}

export interface VentaPorTipo {
  tipo_dte:       string;
  total_facturas: number;
  total_monto:    number;
}

export interface ResumenInventario {
  total_productos:     number;
  total_unidades:      number;
  valor_total:         number;
  productos_sin_stock: number;
}

export interface FilaStock {
  id:               number;
  nombre:           string;
  stock_actual:     number;
  precio_unitario:  number;
  valor_inventario: number;
}

export interface StockResponse {
  resumen:   ResumenInventario;
  productos: FilaStock[];
}

export interface FilaSinStock {
  id:     number;
  nombre: string;
}

export interface FilaLoteVencimiento {
  producto:          string;
  lote:              string | null;
  fecha_vencimiento: string;
  cantidad:          number;
  precio_unitario:   number;
  dias_restantes:    number;
}

export interface FiltroFechas {
  fecha_inicio?: string;
  fecha_fin?:    string;
}

// ── Ventas ────────────────────────────────────────────────────────────────────

export async function getVentas(filtros: FiltroFechas = {}): Promise<VentasResponse> {
  const { data } = await api.get<VentasResponse>('/reportes/ventas', { params: filtros });
  return data;
}

export async function getTopClientes(filtros: FiltroFechas = {}): Promise<TopCliente[]> {
  const { data } = await api.get<TopCliente[]>('/reportes/ventas/top-clientes', { params: filtros });
  return data;
}

export async function getTopProductos(filtros: FiltroFechas = {}): Promise<TopProducto[]> {
  const { data } = await api.get<TopProducto[]>('/reportes/ventas/top-productos', { params: filtros });
  return data;
}

export async function getVentasPorTipo(filtros: FiltroFechas = {}): Promise<VentaPorTipo[]> {
  const { data } = await api.get<VentaPorTipo[]>('/reportes/ventas/por-tipo', { params: filtros });
  return data;
}

export async function descargarVentasExcel(filtros: FiltroFechas = {}): Promise<void> {
  const inicio = filtros.fecha_inicio ?? '';
  const fin    = filtros.fecha_fin    ?? '';
  const res    = await api.get('/reportes/ventas/excel', { params: filtros, responseType: 'blob' });
  const url    = URL.createObjectURL(new Blob([res.data]));
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `Reporte_Ventas_${inicio}_${fin}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Inventario ────────────────────────────────────────────────────────────────

export async function getInventarioStock(): Promise<StockResponse> {
  const { data } = await api.get<StockResponse>('/reportes/inventario/stock');
  return data;
}

export async function getProductosSinStock(): Promise<FilaSinStock[]> {
  const { data } = await api.get<FilaSinStock[]>('/reportes/inventario/sin-stock');
  return data;
}

export async function getLotesPorVencer(dias = 30): Promise<FilaLoteVencimiento[]> {
  const { data } = await api.get<FilaLoteVencimiento[]>('/reportes/inventario/lotes-por-vencer', {
    params: { dias },
  });
  return data;
}

export async function descargarInventarioExcel(dias = 30): Promise<void> {
  const res = await api.get('/reportes/inventario/excel', { params: { dias }, responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data]));
  const a   = document.createElement('a');
  a.href    = url;
  a.download = `Reporte_Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Compras ────────────────────────────────────────────────────────────────────

export interface ResumenCompras {
  total_ordenes:      number;
  monto_total:        number;
  proveedores_unicos: number;
  productos_lineas:   number;
}

export interface FilaCompra {
  id:          number;
  orden_compra: string;
  proveedor:   string;
  fecha_compra: string;
  estado:      string;
  total:       number;
  num_lineas:  number;
}

export interface ComprasResponse {
  periodo:  { inicio: string; fin: string };
  resumen:  ResumenCompras;
  compras:  FilaCompra[];
}

export interface TopProveedor {
  proveedor:     string;
  total_ordenes: number;
  total_monto:   number;
}

export interface CompraPorEstado {
  estado:        string;
  total_ordenes: number;
  total_monto:   number;
}

export async function getComprasReporte(filtros: FiltroFechas = {}): Promise<ComprasResponse> {
  const { data } = await api.get<ComprasResponse>('/reportes/compras', { params: filtros });
  return data;
}

export async function getTopProveedores(filtros: FiltroFechas = {}): Promise<TopProveedor[]> {
  const { data } = await api.get<TopProveedor[]>('/reportes/compras/top-proveedores', { params: filtros });
  return data;
}

export async function getComprasPorEstado(filtros: FiltroFechas = {}): Promise<CompraPorEstado[]> {
  const { data } = await api.get<CompraPorEstado[]>('/reportes/compras/por-estado', { params: filtros });
  return data;
}

export async function descargarComprasExcel(filtros: FiltroFechas = {}): Promise<void> {
  const inicio = filtros.fecha_inicio ?? '';
  const fin    = filtros.fecha_fin    ?? '';
  const res    = await api.get('/reportes/compras/excel', { params: filtros, responseType: 'blob' });
  const url    = URL.createObjectURL(new Blob([res.data]));
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `Reporte_Compras_${inicio}_${fin}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
