/**
 * compra.types.ts — Interfaces TypeScript para Compra en el frontend.
 */

export interface CompraDetalle {
  id:                number;
  compra_id:         number;
  producto_id:       number;
  producto_nombre:   string;
  cantidad:          number;
  lote:              string | null;
  fecha_vencimiento: string | null;
  precio_unitario:   number;
  subtotal:          number;
  created_at:        string;
}

export interface Compra {
  id:               number;
  orden_compra:     string;
  proveedor_id:     number;
  proveedor_nombre: string;
  fecha_compra:     string;
  estado:           string;
  total:            number;
  notas:            string | null;
  items_count:      number;
  created_at:       string;
  updated_at:       string;
}

export interface CompraConDetalle extends Compra {
  lineas: CompraDetalle[];
}

export interface CreateCompraDetalleDTO {
  producto_id:        number;
  cantidad:           number;
  lote?:              string;
  fecha_vencimiento?: string;
  precio_unitario:    number;
}

export interface CreateCompraDTO {
  orden_compra: string;
  proveedor_id: number;
  fecha_compra: string;
  notas?:       string;
  lineas:       CreateCompraDetalleDTO[];
}

/** Fila plana de la tabla: un producto por fila con su orden de compra. */
export interface CompraLineaRow {
  detalle_id:        number;
  compra_id:         number;
  orden_compra:      string;
  proveedor_nombre:  string;
  fecha_compra:      string;
  total_compra:      number;
  notas:             string | null;
  producto_nombre:   string;
  cantidad:          number;
  lote:              string | null;
  fecha_vencimiento: string | null;
  precio_unitario:   number;
  subtotal:          number;
}

export interface PaginatedCompras {
  data:       CompraLineaRow[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
