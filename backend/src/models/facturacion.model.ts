/**
 * facturacion.model.ts — Interfaces TypeScript para Facturación Electrónica.
 *
 * Tipos DTE:
 *   - DTE_01: Factura (Consumidor Final - Persona Natural)
 *   - DTE_03: Crédito Fiscal (Persona Jurídica/Empresa)
 *
 * Impuestos:
 *   - DTE_01: NO desglosa IVA (ya incluido en precio)
 *   - DTE_03: SÍ desglosa IVA al 13%
 */

export type TipoDTE = 'DTE_01' | 'DTE_03' | 'DTE_05' | 'DTE_06' | 'DTE_11';
export type EstadoFactura = 'borrador' | 'facturado' | 'cancelado';

/**
 * Número de control DTE desde Hacienda
 * Formato: DTE-XX-M001P001-000000000000001
 * Últimos 15 dígitos: correlativo
 */
export interface NumeroDTE {
  id: number;
  tipo_dte: TipoDTE;
  numero_actual: number;
  prefijo: string;
  created_at: Date;
  updated_at: Date;
}

/** Fila de la tabla `facturas` */
export interface Factura {
  id: number;
  numero_dte: string;
  tipo_dte: TipoDTE;
  // cliente_id es nullable: NULL en Modo A (Clientes Varios) y Modo B (datos transitorios)
  cliente_id: number | null;
  // Campos de receptor para Modo A y B (cuando cliente_id = NULL)
  receptor_nombre: string | null;
  receptor_correo: string | null;
  // Retención ISR 1% (Art. 156-A CT): solo aplica en DTE_03 con grandes contribuyentes
  retencion_renta: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: EstadoFactura;
  subtotal: number;
  iva: number;
  total: number;
  notas: string | null;
  json_dte_path: string | null;
  json_pdf_path: string | null;
  codigo_generacion: string | null;
  ambiente: string | null;
  doc_relacionado_id: number | null;
  condicion_operacion: number | null;
  metodo_pago: string | null;
  punto_venta_id: number | null;
  created_at: Date;
  updated_at: Date;
}

/** Fila de la tabla `factura_detalles` */
export interface FacturaDetalle {
  id: number;
  factura_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento: number;             // descuento por unidad ($) — campo descuento de la tabla
  iva_unitario: number;
  subtotal: number;
  total_linea: number;
  /** ID del registro de inventario descontado — para restaurar el lote exacto en devoluciones */
  lote_inventario_id: number | null;
  created_at: Date;
}

/** Factura con detalle completo y datos del cliente */
export interface FacturaConDetalle extends Factura {
  // Puede ser null si receptor_modo = A o B
  cliente_nombre: string | null;
  cliente_tipo: string | null;
  cliente_documento: string | null;
  detalles: FacturaDetalleConProducto[];
}

/** Detalle con información del producto */
export interface FacturaDetalleConProducto extends FacturaDetalle {
  producto_nombre: string;
  categoria_nombre: string | null;
}

/**
 * Modo de receptor en la factura:
 *   A = Clientes Varios (anónimo — "Consumidor Final")
 *   B = Datos transitorios (nombre + correo, sin guardar como cliente)
 *   C = Cliente registrado (comportamiento original)
 */
export type ReceptorModo = 'A' | 'B' | 'C';

/** DTO para crear una línea de factura */
export interface CreateFacturaDetalleDTO {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;  // descuento por unidad ($) — montoDescu en DTE MH
  lote?: string | null;  // lote de inventario seleccionado por el usuario
}

/** DTO para crear una factura */
export interface CreateFacturaDTO {
  // Terminal que emite la factura — cada punto_venta tiene su propia secuencia DTE
  punto_venta_id: number;
  // Modo de receptor — determina qué datos de receptor se usan
  receptor_modo: ReceptorModo;
  // Modo C: cliente registrado (requerido si receptor_modo = 'C')
  cliente_id?: number;
  // Modo B: datos transitorios (requeridos si receptor_modo = 'B')
  receptor_nombre?: string;
  receptor_correo?: string;
  // Override manual de tipo DTE (solo aplica en Modo C).
  // null/undefined = auto-detectar por tipo_cliente (persona_natural→DTE_01, empresa→DTE_03).
  // Útil cuando el cliente quiere DTE_01, DTE_03 o DTE_11 puntualmente.
  tipo_dte_override?: TipoDTE;
  // Retención ISR 1% (Art.156-A) — solo DTE_03 con grandes contribuyentes
  retencion_renta?: number;
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';
  fecha_emision: string;
  fecha_vencimiento?: string;
  notas?: string;
  detalles: CreateFacturaDetalleDTO[];
}

/** Respuesta al crear factura */
export interface FacturaResponse {
  id: number;
  numero_dte: string;
  tipo_dte: TipoDTE;
  factura: FacturaConDetalle;
  json_dte: DTEJSON;
  json_pdf: PDFVisualizacionJSON;
}

/**
 * JSON para envío a Hacienda (DTE) — estructura oficial MH El Salvador
 */
export interface DTEJSON {
  identificacion: {
    version: number;
    ambiente: string;   // "00"=pruebas, "01"=producción
    tipoDte: string;   // "01", "03", "05", "06", "11"
    numeroControl: string;   // DTE-XX-XXXXXXXX-000000000000001
    codigoGeneracion: string;  // UUID v4
    tipoModelo: number;   // 1=online, 2=contingencia
    tipoOperacion: number;   // 1=normal, 2=contingencia
    tipoContingencia: number | null;
    motivoContin: string | null;
    fecEmi: string;   // YYYY-MM-DD
    horEmi: string;   // HH:MM:SS
    tipoMoneda: string;   // "USD"
  };
  documentoRelacionado: DTEDocRelacionado[] | null;
  emisor: {
    nit: string;
    nrc: string | null;
    nombre: string;
    codActividad: string | null;
    descActividad: string | null;
    nombreComercial: string | null;
    tipoEstablecimiento: string;  // CAT-009 ("02"=establecimiento)
    codEstableMH: string | null;
    codEstable: string | null;
    codPuntoVentaMH: string | null;
    codPuntoVenta: string | null;
    telefono: string | null;
    correo: string | null;
    direccion: {
      departamento: string;  // código CAT-012
      municipio: string;  // código CAT-013
      complemento: string;
    };
  };
  receptor: {
    tipoDocumento: string | null;  // CAT-022 ("13"=DUI, "36"=NIT, "03"=Pasaporte)
    numDocumento: string | null;
    nrc: string | null;
    nombre: string;
    codActividad: string | null;
    descActividad: string | null;
    nombreComercial: string | null;
    direccion: { departamento: string; municipio: string; complemento: string } | null;
    telefono: string | null;
    correo: string | null;
  };
  otrosDocumentos: null;
  ventaTercero: null;
  cuerpoDocumento: DTELinea[];
  resumen: {
    totalNoSuj: number;
    totalExenta: number;
    totalGravada: number;
    subTotalVentas: number;
    descuNoSuj: number;
    descuExenta: number;
    descuGravada: number;
    porcentajeDescuento: number;
    totalDescu: number;
    tributos: DTETributo[] | null;
    subTotal: number;
    ivaRete1: number;
    reteRenta: number;
    montoTotalOperacion: number;
    totalLetras: string;
    totalIva: number;
    saldoFavor: number;
    condicionOperacion: number;  // 1=contado, 2=crédito, 3=otro
    pagos: DTEPago[] | null;
    numPagoElectronico: string | null;
  };
  extension: null;
  apendice: null;
}

export interface DTELinea {
  numItem: number;
  tipoItem: number;   // 1=bienes, 2=servicios, 3=ambos, 4=otros
  numeroDocumento: string | null;
  cantidad: number;
  codigo: string | null;
  codTributo: string | null;
  uniMedida: number;   // CAT-014 (59=unidad)
  descripcion: string;
  precioUni: number;
  montoDescu: number;
  ventaNoSuj: number;
  ventaExenta: number;
  ventaGravada: number;
  tributos: string[] | null;  // ["20"] = IVA
  psv: number;
  noGravado: number;
}

export interface DTEDocRelacionado {
  tipoDocumento: string;
  tipoGeneracion: number;
  numeroDocumento: string;
  fechaEmision: string;
}

export interface DTETributo {
  codigo: string;
  descripcion: string;
  valor: number;
}

export interface DTEPago {
  codigo: string;
  montoPago: number;
  referencia: string | null;
  plazo: string | null;
  periodo: number | null;
}

// Kept for backwards compatibility (PDF viewer)
export interface DTELineaJSON {
  numero_linea: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  iva_unitario?: number;
  subtotal: number;
  total_linea: number;
}

/**
 * JSON para visualización en PDF virtual (React/HTML)
 */
export interface PDFVisualizacionJSON {
  numero_dte: string;
  tipo_dte_nombre: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  numero_interno?: string;

  emisor: {
    nombre_negocio: string;
    nit: string;
    direccion: string;
    telefono: string;
    correo: string;
  };

  cliente: {
    nombre: string;
    tipo_cliente: string;
    documento: string;
    direccion?: string;
    telefono?: string;
    correo?: string;
  };

  lineas: PDFLineaJSON[];

  resumen: {
    subtotal: number;
    descuento?: number;         // total de descuentos aplicados
    iva?: number;
    iva_porcentaje?: number;
    retencion_renta?: number;   // retención ISR 1% (Art.156-A CT) si aplica
    total: number;
    moneda: string;
  };

  notas?: string;
  pie_de_pagina?: string;
}

export interface PDFLineaJSON {
  numero_linea: number;
  codigo_producto?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;   // monto total de descuento en la línea (descUnit × cantidad)
  subtotal: number;
  iva_linea?: number;
  total: number;
}
