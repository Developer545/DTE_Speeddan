/**
 * facturacion.types.ts — Tipos de datos para el módulo de Facturación.
 *
 * TipoDTE (sincronizado con backend — todos los 5 tipos DTE):
 *   DTE_01 = Factura (Consumidor Final)
 *   DTE_03 = Crédito Fiscal
 *   DTE_05 = Nota de Crédito
 *   DTE_06 = Nota de Débito
 *   DTE_11 = Factura de Exportación
 *
 * ReceptorModo:
 *   A = Clientes Varios (anónimo — "Consumidor Final")
 *   B = Datos transitorios (nombre + correo, sin guardar como cliente)
 *   C = Cliente registrado (flujo original)
 */

export type TipoDTE      = 'DTE_01' | 'DTE_03' | 'DTE_05' | 'DTE_06' | 'DTE_11';
export type EstadoFactura = 'borrador' | 'facturado' | 'cancelado';
export type ReceptorModo  = 'A' | 'B' | 'C';

export interface Factura {
  id: number;
  numero_dte: string;
  tipo_dte: TipoDTE;
  // cliente_id es nullable: NULL en Modo A (Clientes Varios) y Modo B
  cliente_id: number | null;
  receptor_nombre: string | null;   // solo para Modo B
  receptor_correo: string | null;   // solo para Modo B
  retencion_renta: number;          // ISR 1% Art.156-A CT (0 si no aplica)
  // Datos del cliente para mostrar en lista (calculados en SELECT)
  cliente_nombre: string;           // COALESCE(c.nombre, f.receptor_nombre, 'Clientes Varios')
  cliente_tipo: string | null;
  cliente_documento: string | null;
  fecha_emision: string;
  fecha_vencimiento?: string;
  estado: EstadoFactura;
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
  json_dte_path?: string;
  json_pdf_path?: string;
  created_at: string;
  updated_at: string;
  detalles: FacturaDetalle[];
}

export interface FacturaDetalle {
  id: number;
  factura_id: number;
  producto_id: number;
  producto_nombre: string;
  categoria_nombre?: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;      // descuento por unidad ($) — montoDescu en DTE
  iva_unitario: number;
  subtotal: number;
  total_linea: number;
  created_at: string;
}

/** Línea del carrito POS — incluye descuento por unidad */
export interface FacturaLineaPOS {
  producto_id:     number;
  producto_nombre?: string;
  cantidad:        number;
  precio_unitario: number;
  descuento?:      number;   // descuento por unidad ($)
  subtotal?:       number;   // calculado: (precio - descuento) × cantidad
  lote?:           string | null;
}

export interface ConfigPOS {
  nombreNegocio: string;
  nit: string;
  direccion: string;
  telefono: string;
  correo: string;
}
