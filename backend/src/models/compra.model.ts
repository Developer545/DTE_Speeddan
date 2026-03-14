/**
 * compra.model.ts — Interfaces TypeScript para Compra y CompraDetalle.
 */

/** Fila de la tabla `compras`. */
export interface Compra {
  id:            number;
  orden_compra:  string;
  proveedor_id:  number;
  fecha_compra:  string;
  estado:        string;
  total:         number;
  notas:         string | null;
  created_at:    string;
  updated_at:    string;
}

/** Fila de la tabla `compra_detalle`. */
export interface CompraDetalle {
  id:                number;
  compra_id:         number;
  producto_id:       number;
  cantidad:          number;
  lote:              string | null;
  fecha_vencimiento: string | null;
  precio_unitario:   number;
  subtotal:          number;
  created_at:        string;
}

/** DTO para crear una línea de compra. */
export interface CreateCompraDetalleDTO {
  producto_id:       number;
  cantidad:          number;
  lote?:             string;
  fecha_vencimiento?: string;
  precio_unitario:   number;
}

/** DTO para crear una compra con sus líneas. */
export interface CreateCompraDTO {
  orden_compra: string;
  proveedor_id: number;
  fecha_compra: string;
  notas?:       string;
  lineas:       CreateCompraDetalleDTO[];
}

/** Compra con detalle completo para la vista de detalle. */
export interface CompraConDetalle extends Compra {
  proveedor_nombre: string;
  lineas:           (CompraDetalle & { producto_nombre: string })[];
}
