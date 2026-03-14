/**
 * dashboard.service.ts — Tipos y función de API para el Dashboard ERP.
 */

import api from './api';

export interface DashboardKpis {
  ventas_hoy:          number;
  ventas_mes:          number;
  ventas_mes_anterior: number;
  facturas_borrador:   number;
  valor_inventario:    number;
  productos_sin_stock: number;
  lotes_por_vencer:    number;
  total_clientes:      number;
  compras_mes:         number;
}

export interface VentaDia {
  fecha: string;
  total: number;
}

export interface TopProducto {
  nombre: string;
  total:  number;
}

export interface VentaTipo {
  tipo_dte: string;
  total:    number;
}

export interface ActividadItem {
  tipo:       'factura' | 'compra';
  referencia: string;
  total:      number;
  fecha:      string;
  estado:     string;
}

export interface ModuloCounts {
  facturas_pendientes: number;
  compras_mes:         number;
  total_clientes:      number;
  total_productos:     number;
}

export interface DashboardData {
  kpis:               DashboardKpis;
  ventas_por_dia:     VentaDia[];
  top_productos:      TopProducto[];
  ventas_por_tipo:    VentaTipo[];
  actividad_reciente: ActividadItem[];
  modulo_counts:      ModuloCounts;
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
}
