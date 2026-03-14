/**
 * inventario.model.ts — Interfaces TypeScript para Inventario.
 */

/** Fila de la tabla `inventario` con joins a productos/categorias. */
export interface Inventario {
  id:                number;
  producto_id:       number;
  producto_nombre:   string;
  categoria_nombre:  string | null;
  lote:              string | null;
  fecha_vencimiento: string | null;
  cantidad:          number;
  precio_unitario:   number;
  ultima_compra_id:  number | null;
  created_at:        string;
  updated_at:        string;
}
