/**
 * inventario.types.ts — Interfaces TypeScript para Inventario en el frontend.
 */

export interface Inventario {
  id:                number;
  producto_id:       number;
  producto_nombre:   string;
  categoria_nombre:  string | null;
  lote:              string | null;
  fecha_vencimiento: string | null;
  cantidad:          number;
  precio_unitario:   number;
  stock_minimo:      number;
  ultima_compra_id:  number | null;
  created_at:        string;
  updated_at:        string;
}

export interface PaginatedInventario {
  data:       Inventario[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export type TipoAjuste =
  | 'merma'
  | 'dano'
  | 'robo'
  | 'correccion_positiva'
  | 'correccion_negativa';

export interface MovimientoKardex {
  id:              number;
  tipo:            string;
  descripcion:     string;
  referencia:      string | null;
  entrada:         number | null;
  salida:          number | null;
  saldo:           number;
  precio_unitario: number | null;
  motivo:          string | null;
  fecha:           string;
}

export interface AlertaStock {
  producto_id:      number;
  producto_nombre:  string;
  categoria_nombre: string | null;
  stock_actual:     number;
  stock_minimo:     number;
  diferencia:       number;
}
