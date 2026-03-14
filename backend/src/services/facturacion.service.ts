/**
 * facturacion.service.ts — Lógica de negocio para Facturación Electrónica.
 *
 * Responsabilidades:
 *   1. Generar número DTE próximo
 *   2. Determinar tipo de DTE basado en tipo_cliente
 *   3. Crear factura con detalles en transacción
 *   4. Descontar inventario automáticamente
 *   5. Generar JSON para Hacienda
 *   6. Generar JSON para visualización PDF
 *   7. Guardar archivos JSON
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { pool } from '../config/database';
import { PoolClient } from 'pg';
import {
  Factura,
  FacturaConDetalle,
  CreateFacturaDTO,
  FacturaResponse,
  TipoDTE,
  ReceptorModo,
  DTEJSON,
  DTELinea,
  DTETributo,
  DTEPago,
  PDFVisualizacionJSON,
  FacturaDetalleConProducto,
} from '../models/facturacion.model';
import { PaginatedResponse, ListQueryParams } from '../types/api.types';
import { AppError } from '../middleware/errorHandler';

// Constantes
const IVA_PORCENTAJE = 0.13;
const CARPETA_JSONDTE = path.join(__dirname, '..', '..', '..', 'jsonDTE');
// El prefijo se lee dinámicamente desde numeros_dte (configurable desde Configuración → DTE)

/**
 * Asegurar que la carpeta jsondte existe
 */
function asegurarCarpetaJSONDTE(): void {
  if (!fs.existsSync(CARPETA_JSONDTE)) {
    fs.mkdirSync(CARPETA_JSONDTE, { recursive: true });
  }
}

/**
 * Obtener el siguiente número DTE (correlativo) para un punto de venta específico.
 * Cada terminal tiene su propia secuencia por tipo DTE.
 * Formato: DTE-XX-M001P001-000000000000001 (15 dígitos)
 */
async function obtenerSiguienteNumeroDTE(tipoDTE: TipoDTE, puntoVentaId: number): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock de la fila exacta: (tipo_dte, punto_venta_id) — evita condiciones de carrera
    const lockResult = await client.query<{ numero_actual: number; prefijo: string }>(
      `SELECT numero_actual, prefijo
       FROM numeros_dte
       WHERE tipo_dte = $1 AND punto_venta_id = $2
       FOR UPDATE`,
      [tipoDTE, puntoVentaId]
    );

    if (lockResult.rows.length === 0) {
      throw new AppError(
        `Correlativo no configurado para tipo ${tipoDTE} en terminal ${puntoVentaId}. ` +
        'Ve a Configuración → Sucursales para verificar el punto de venta.',
        500
      );
    }

    const { numero_actual, prefijo } = lockResult.rows[0];
    const numeroSiguiente = numero_actual + 1;

    await client.query(
      `UPDATE numeros_dte SET numero_actual = $1 WHERE tipo_dte = $2 AND punto_venta_id = $3`,
      [numeroSiguiente, tipoDTE, puntoVentaId]
    );

    await client.query('COMMIT');

    // Formato: DTE-01-M001P001-000000000000001
    const tipoStr = tipoDTE.replace('DTE_', '');
    const numeroFormato = String(numeroSiguiente).padStart(15, '0');
    return `DTE-${tipoStr}-${prefijo}-${numeroFormato}`;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Determinar tipo de DTE basado en tipo_cliente.
 * - persona_natural → DTE_01 (Factura Consumidor Final)
 * - empresa         → DTE_03 (Crédito Fiscal)
 */
async function determinarTipoDTE(clienteId: number, tenantId: number): Promise<TipoDTE> {
  const result = await pool.query<{ tipo_cliente: string }>(
    `SELECT tipo_cliente FROM clientes WHERE id = $1 AND tenant_id = $2`,
    [clienteId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Cliente no encontrado', 404);
  }

  const tipoCliente = result.rows[0].tipo_cliente;
  return tipoCliente === 'persona_natural' ? 'DTE_01' : 'DTE_03';
}

/**
 * Crear factura con todas sus líneas y descontar inventario.
 *
 * Soporta tres modos de receptor:
 *   Modo A — Clientes Varios (anónimo): cliente_id=NULL, receptor "Consumidor Final"
 *   Modo B — Datos transitorios:         cliente_id=NULL, receptor con nombre+correo
 *   Modo C — Cliente registrado:         cliente_id=X (flujo original)
 */
export async function crearFactura(
  dto: CreateFacturaDTO,
  tenantId: number
): Promise<FacturaResponse> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const modo: ReceptorModo = dto.receptor_modo ?? 'C';

    // Validar que se enviò el punto_venta_id
    if (!dto.punto_venta_id) {
      throw new AppError('punto_venta_id es requerido para emitir facturas', 400);
    }
    const puntoVentaId = dto.punto_venta_id;

    // 1. Determinar tipo DTE según modo
    let tipoDTE: TipoDTE;
    if (modo === 'C' && dto.cliente_id) {
      if (dto.tipo_dte_override) {
        // Override manual: el usuario eligió un tipo DTE específico para esta transacción
        tipoDTE = dto.tipo_dte_override;
      } else {
        // Auto-detección por tipo_cliente (comportamiento por defecto)
        tipoDTE = await determinarTipoDTE(dto.cliente_id, tenantId);
      }
    } else {
      // Modos A y B: siempre DTE_01 (Consumidor Final — persona no identificada)
      tipoDTE = 'DTE_01';
    }

    // 2. Retención ISR 1% — solo válida en DTE_03 con grandes contribuyentes
    const retencionRenta = (tipoDTE === 'DTE_03' && dto.retencion_renta && dto.retencion_renta > 0)
      ? r2(dto.retencion_renta)
      : 0;

    // 3. Obtener siguiente número DTE del correlativo de ESTE punto de venta
    const numeroDTE = await obtenerSiguienteNumeroDTE(tipoDTE, puntoVentaId);

    // 4. Calcular totales desde los detalles (con soporte de descuento por línea)
    let subtotal = 0;  // suma de (precio * cantidad) sin descuentos
    let totalDescuento = 0;
    let totalIVA = 0;

    for (const detalle of dto.detalles) {
      const descUnit = r2(detalle.descuento ?? 0);
      const precioNeto = r2(detalle.precio_unitario - descUnit);
      const lineaSubtotal = r2(precioNeto * detalle.cantidad);
      subtotal += r2(detalle.precio_unitario * detalle.cantidad);
      totalDescuento += r2(descUnit * detalle.cantidad);

      // Solo DTE_03 desglosa IVA (en DTE_01 el IVA ya está embebido)
      if (tipoDTE === 'DTE_03') {
        totalIVA += r2(lineaSubtotal * IVA_PORCENTAJE);
      }
    }

    // Total neto de ventas (después de descuentos, antes de IVA externo)
    const subtotalNeto = r2(subtotal - totalDescuento);
    // Total final: subtotal neto + IVA desglosado - retención ISR
    const total = r2(subtotalNeto + totalIVA - retencionRenta);

    // 5. Insertar factura en base de datos
    const codigoGeneracion = randomUUID().toUpperCase();

    // Datos de receptor según modo
    const clienteIdGuardar = (modo === 'C' && dto.cliente_id) ? dto.cliente_id : null;
    const receptorNombreGuardar = modo === 'B' ? (dto.receptor_nombre ?? null) : null;
    const receptorCorreoGuardar = modo === 'B' ? (dto.receptor_correo ?? null) : null;

    const facturaResult = await client.query<{ id: number; numero_dte: string }>(
      `INSERT INTO facturas (
        numero_dte, tipo_dte, cliente_id,
        receptor_nombre, receptor_correo, retencion_renta,
        fecha_emision, fecha_vencimiento,
        estado, subtotal, iva, total, notas,
        codigo_generacion, ambiente, condicion_operacion,
        punto_venta_id, metodo_pago, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'borrador', $9, $10, $11, $12, $13, '00', 1, $14, $15, $16)
       RETURNING id, numero_dte`,
      [
        numeroDTE, tipoDTE, clienteIdGuardar,
        receptorNombreGuardar, receptorCorreoGuardar, retencionRenta,
        dto.fecha_emision, dto.fecha_vencimiento || null,
        subtotalNeto,
        tipoDTE === 'DTE_03' ? totalIVA : 0,
        total,
        dto.notas || null,
        codigoGeneracion,
        puntoVentaId,
        dto.metodo_pago ?? 'efectivo',
        tenantId,
      ]
    );

    const facturaId = facturaResult.rows[0].id;

    // 6. Insertar detalles y descontar inventario
    const detallesConProducto: FacturaDetalleConProducto[] = [];

    for (let i = 0; i < dto.detalles.length; i++) {
      const detalle = dto.detalles[i];
      const descUnit = r2(detalle.descuento ?? 0);
      const precioNeto = r2(detalle.precio_unitario - descUnit);

      // Obtener información del producto
      const productoResult = await client.query<{
        nombre: string;
        categoria_id: number | null;
      }>(
        `SELECT nombre, categoria_id FROM productos WHERE id = $1`,
        [detalle.producto_id]
      );

      if (productoResult.rows.length === 0) {
        throw new AppError(`Producto ID ${detalle.producto_id} no encontrado`, 404);
      }

      const producto = productoResult.rows[0];
      // IVA unitario solo en DTE_03 (sobre precio neto después de descuento)
      const ivaUnitario = tipoDTE === 'DTE_03' ? r2(precioNeto * IVA_PORCENTAJE) : 0;
      const subtotalLinea = r2(precioNeto * detalle.cantidad);
      const totalLinea = r2(subtotalLinea + ivaUnitario * detalle.cantidad);

      // Obtener nombre de categoría
      let categoriaNombre: string | null = null;
      if (producto.categoria_id) {
        const catResult = await client.query<{ nombre: string }>(
          `SELECT nombre FROM categorias WHERE id = $1`,
          [producto.categoria_id]
        );
        if (catResult.rows.length > 0) {
          categoriaNombre = catResult.rows[0].nombre;
        }
      }

      // Descontar inventario (del lote seleccionado o FIFO si no se especificó)
      // Retorna el ID del lote utilizado para trazabilidad en devoluciones
      const loteInventarioId = await descontarInventario(
        client,
        detalle.producto_id,
        detalle.cantidad,
        tenantId,
        detalle.lote ?? undefined
      );

      // Insertar detalle guardando el lote de inventario utilizado
      const detalleResult = await client.query<{ id: number; created_at: Date }>(
        `INSERT INTO factura_detalles (
          factura_id, producto_id, cantidad, precio_unitario,
          descuento, iva_unitario, subtotal, total_linea, lote_inventario_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, created_at`,
        [
          facturaId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario,
          descUnit, ivaUnitario, subtotalLinea, totalLinea, loteInventarioId,
        ]
      );

      detallesConProducto.push({
        id: detalleResult.rows[0].id,
        factura_id: facturaId,
        producto_id: detalle.producto_id,
        producto_nombre: producto.nombre,
        categoria_nombre: categoriaNombre,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        descuento: descUnit,
        iva_unitario: ivaUnitario,
        subtotal: subtotalLinea,
        total_linea: totalLinea,
        lote_inventario_id: loteInventarioId,
        created_at: detalleResult.rows[0].created_at,
      });
    }

    // 7a. Obtener configuración de la empresa (para el JSON DTE y PDF)
    const empresaResult = await client.query<{
      nombre_negocio: string; nit: string | null; ncr: string | null;
      direccion: string | null; telefono: string | null; correo: string | null;
      cod_actividad: string | null; desc_actividad: string | null;
      tipo_establecimiento: string | null;
      dep_codigo: string | null; mun_codigo: string | null;
    }>(`
      SELECT
        ce.nombre_negocio, ce.nit, ce.ncr, ce.direccion, ce.telefono, ce.correo,
        ce.cod_actividad, ce.desc_actividad, ce.tipo_establecimiento,
        cd.codigo AS dep_codigo, cm.codigo AS mun_codigo
      FROM configuracion_empresa ce
      LEFT JOIN cat_departamentos cd ON cd.id = ce.departamento_id
      LEFT JOIN cat_municipios cm ON cm.id = ce.municipio_id
      WHERE ce.tenant_id = $1
    `, [tenantId]);
    const empresa = empresaResult.rows[0] ?? {
      nombre_negocio: 'Mi Empresa', nit: null, ncr: null,
      direccion: null, telefono: null, correo: null,
      cod_actividad: null, desc_actividad: null, tipo_establecimiento: null,
      dep_codigo: null, mun_codigo: null,
    };

    // 7b. Obtener datos del receptor según modo
    //   Modo C: consultar la tabla clientes con ncr real
    //   Modo A/B: construir receptor sintético
    type ClienteRow = {
      tipo_cliente: string; tipo_documento: string;
      nombre_completo: string; numero_documento: string;
      nit: string | null; ncr: string | null;
      direccion: string | null; telefono: string | null; correo: string | null;
      dep_codigo: string | null; mun_codigo: string | null;
    };

    let clienteRow: ClienteRow;

    if (modo === 'C' && dto.cliente_id) {
      const clienteResult = await client.query<ClienteRow>(
        `SELECT
           c.tipo_cliente, c.tipo_documento, c.nombre_completo,
           c.numero_documento,
           -- Si la persona_natural tiene NIT separado, usarlo como identificador DTE
           COALESCE(c.nit,
             CASE WHEN c.tipo_documento = 'NIT' THEN c.numero_documento ELSE NULL END
           ) AS nit,
           c.ncr,
           c.direccion, c.telefono, c.correo,
           cd.codigo AS dep_codigo, cm.codigo AS mun_codigo
         FROM clientes c
         LEFT JOIN cat_departamentos cd ON cd.id = c.departamento_id
         LEFT JOIN cat_municipios cm ON cm.id = c.municipio_id
         WHERE c.id = $1`,
        [dto.cliente_id]
      );
      clienteRow = clienteResult.rows[0];
    } else if (modo === 'B') {
      // Datos transitorios: receptor con nombre y correo, sin documento
      clienteRow = {
        tipo_cliente: 'persona_natural',
        tipo_documento: 'Otro',
        nombre_completo: dto.receptor_nombre ?? 'Consumidor Final',
        numero_documento: '',
        nit: null, ncr: null,
        direccion: null,
        telefono: null,
        correo: dto.receptor_correo ?? null,
        dep_codigo: null, mun_codigo: null,
      };
    } else {
      // Modo A: completamente anónimo — "Consumidor Final"
      clienteRow = {
        tipo_cliente: 'persona_natural',
        tipo_documento: 'Otro',
        nombre_completo: 'Consumidor Final',
        numero_documento: '',
        nit: null, ncr: null,
        direccion: null, telefono: null, correo: null,
        dep_codigo: null, mun_codigo: null,
      };
    }

    // 8. Generar JSONs
    asegurarCarpetaJSONDTE();

    const jsonDTE = generarDTEJSON(
      numeroDTE, codigoGeneracion, tipoDTE, modo,
      empresa, clienteRow,
      dto.fecha_emision, detallesConProducto,
      subtotalNeto, tipoDTE === 'DTE_03' ? totalIVA : 0,
      total, totalDescuento, retencionRenta
    );

    const jsonPDF = generarPDFVisualizacionJSON(
      numeroDTE, tipoDTE, modo, clienteRow, empresa,
      dto.fecha_emision, dto.fecha_vencimiento,
      detallesConProducto,
      subtotalNeto, tipoDTE === 'DTE_03' ? totalIVA : 0,
      total, totalDescuento, retencionRenta,
      dto.notas
    );

    // 9. Guardar JSONs en archivos
    const nombreArchivoDTE = `dte_${numeroDTE.replace(/\//g, '_')}.json`;
    const nombreArchivoPDF = `pdf_visualizacion_${numeroDTE.replace(/\//g, '_')}.json`;

    const rutaDTE = path.join(CARPETA_JSONDTE, nombreArchivoDTE);
    const rutaPDF = path.join(CARPETA_JSONDTE, nombreArchivoPDF);

    fs.writeFileSync(rutaDTE, JSON.stringify(jsonDTE, null, 2));
    fs.writeFileSync(rutaPDF, JSON.stringify(jsonPDF, null, 2));

    // 10. Actualizar rutas de archivos en BD
    await client.query(
      `UPDATE facturas SET json_dte_path = $1, json_pdf_path = $2 WHERE id = $3`,
      [nombreArchivoDTE, nombreArchivoPDF, facturaId]
    );

    await client.query('COMMIT');

    // 11. Construir respuesta
    const facturaConDetalle: FacturaConDetalle = {
      id: facturaId,
      numero_dte: numeroDTE,
      tipo_dte: tipoDTE,
      cliente_id: clienteIdGuardar,
      receptor_nombre: receptorNombreGuardar,
      receptor_correo: receptorCorreoGuardar,
      retencion_renta: retencionRenta,
      cliente_nombre: modo === 'C' ? clienteRow.nombre_completo : null,
      cliente_tipo: modo === 'C' ? clienteRow.tipo_cliente : null,
      cliente_documento: modo === 'C' ? clienteRow.numero_documento : null,
      fecha_emision: dto.fecha_emision,
      fecha_vencimiento: dto.fecha_vencimiento ?? null,
      estado: 'borrador',
      subtotal: subtotalNeto,
      iva: tipoDTE === 'DTE_03' ? totalIVA : 0,
      total,
      notas: dto.notas || null,
      json_dte_path: nombreArchivoDTE,
      json_pdf_path: nombreArchivoPDF,
      codigo_generacion: codigoGeneracion,
      ambiente: '00',
      doc_relacionado_id: null,
      condicion_operacion: 1,
      metodo_pago: dto.metodo_pago ?? 'efectivo',
      punto_venta_id: puntoVentaId,
      created_at: new Date(),
      updated_at: new Date(),
      detalles: detallesConProducto,
    };

    return {
      id: facturaId,
      numero_dte: numeroDTE,
      tipo_dte: tipoDTE,
      factura: facturaConDetalle,
      json_dte: jsonDTE,
      json_pdf: jsonPDF,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Descontar cantidad del inventario.
 * - Si se indica `lote`, descuenta exclusivamente de ese lote.
 * - Si no se indica, usa FIFO (primero sin vencimiento, luego los que vencen antes).
 */
/**
 * Descuenta inventario del lote indicado (o por FIFO si no se especifica).
 * @returns ID del primer registro de inventario utilizado (para trazabilidad en devoluciones).
 *          Retorna null si no se encontraron lotes (caso de error).
 */
async function descontarInventario(
  client: PoolClient,
  productoId: number,
  cantidad: number,
  tenantId: number,
  lote?: string
): Promise<number | null> {
  let cantidadADescontar = cantidad;
  let primerLoteId: number | null = null;

  const inventarioResult = await client.query<{
    id: number;
    cantidad: number;
  }>(
    lote !== undefined
      ? `SELECT id, cantidad FROM inventario
         WHERE producto_id = $1
           AND COALESCE(lote, '') = COALESCE($2, '')
           AND tenant_id = $3
         FOR UPDATE`
      : `SELECT id, cantidad FROM inventario
         WHERE producto_id = $1
           AND tenant_id = $2
         ORDER BY
           CASE WHEN fecha_vencimiento IS NULL THEN 0 ELSE 1 END,
           fecha_vencimiento ASC NULLS LAST,
           created_at ASC
         FOR UPDATE`,
    lote !== undefined ? [productoId, lote, tenantId] : [productoId, tenantId]
  );

  for (const row of inventarioResult.rows) {
    if (cantidadADescontar <= 0) break;

    // Registrar el primer lote utilizado (para trazabilidad en devoluciones)
    if (primerLoteId === null) primerLoteId = row.id;

    const deActual = Math.min(cantidadADescontar, row.cantidad);

    await client.query(
      `UPDATE inventario SET cantidad = cantidad - $1 WHERE id = $2`,
      [deActual, row.id]
    );

    cantidadADescontar -= deActual;
  }

  if (cantidadADescontar > 0) {
    throw new AppError(
      `Inventario insuficiente para el producto ID ${productoId}. ` +
      `Faltaron ${cantidadADescontar} unidades.`,
      400
    );
  }

  return primerLoteId;
}

/**
 * Obtener factura con todas sus líneas.
 * Usa LEFT JOIN para soportar facturas sin cliente (Modo A y B).
 */
export async function obtenerFacturaConDetalle(
  facturaId: number,
  tenantId: number
): Promise<FacturaConDetalle> {
  const result = await pool.query<
    Factura & {
      cliente_nombre: string | null;
      cliente_tipo: string | null;
      cliente_documento: string | null;
    }
  >(
    `SELECT
       f.*,
       c.nombre_completo AS cliente_nombre,
       c.tipo_cliente    AS cliente_tipo,
       c.numero_documento AS cliente_documento
     FROM facturas f
     LEFT JOIN clientes c ON c.id = f.cliente_id
     WHERE f.id = $1 AND f.tenant_id = $2`,
    [facturaId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Factura no encontrada', 404);
  }

  const factura = result.rows[0];

  // Obtener detalles
  const detallesResult = await pool.query<FacturaDetalleConProducto>(
    `SELECT
       fd.*,
       p.nombre AS producto_nombre,
       cat.nombre AS categoria_nombre
     FROM factura_detalles fd
     JOIN productos p ON p.id = fd.producto_id
     LEFT JOIN categorias cat ON cat.id = p.categoria_id
     WHERE fd.factura_id = $1
     ORDER BY fd.id ASC`,
    [facturaId]
  );

  return {
    ...factura,
    detalles: detallesResult.rows,
  };
}

/**
 * Listar facturas con paginación.
 * Usa LEFT JOIN para incluir facturas sin cliente (Modo A y B).
 * cliente_nombre muestra receptor_nombre (Modo B) o "Clientes Varios" (Modo A).
 */
export async function listarFacturas(
  params: ListQueryParams,
  tenantId: number
): Promise<PaginatedResponse<Factura & { cliente_nombre: string }>> {
  const { search = '', page = 1, limit = 10, fecha_emision, punto_venta_id } = params;
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const selectNombre = `
    COALESCE(c.nombre_completo, f.receptor_nombre, 'Clientes Varios') AS cliente_nombre
  `;

  let whereClause = `
    WHERE f.tenant_id = $1
      AND (f.numero_dte ILIKE $2
           OR c.nombre_completo ILIKE $2
           OR c.numero_documento ILIKE $2
           OR f.receptor_nombre ILIKE $2)
  `;

  const queryParams: any[] = [tenantId, searchPattern];
  let paramCount = 2;

  if (fecha_emision) {
    paramCount++;
    whereClause += ` AND DATE(f.fecha_emision) = $${paramCount}`;
    queryParams.push(fecha_emision);
  }

  if (punto_venta_id) {
    paramCount++;
    whereClause += ` AND f.punto_venta_id = $${paramCount}`;
    queryParams.push(punto_venta_id);
  }

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM facturas f
       LEFT JOIN clientes c ON c.id = f.cliente_id
       ${whereClause}`,
      queryParams
    ),
    pool.query<Factura & { cliente_nombre: string }>(
      `SELECT f.*, ${selectNombre}
       FROM facturas f
       LEFT JOIN clientes c ON c.id = f.cliente_id
       ${whereClause}
       ORDER BY f.fecha_emision DESC, f.id DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Cambiar estado de factura a 'facturado'
 */
export async function marcarFacturado(facturaId: number, tenantId: number): Promise<Factura> {
  const result = await pool.query<Factura>(
    `UPDATE facturas
     SET estado = 'facturado', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [facturaId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Factura no encontrada', 404);
  }

  return result.rows[0];
}

/**
 * Cambiar estado de factura a 'cancelado'
 */
export async function cancelarFactura(facturaId: number, tenantId: number): Promise<Factura> {
  const result = await pool.query<Factura>(
    `UPDATE facturas
     SET estado = 'cancelado', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [facturaId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Factura no encontrada', 404);
  }

  return result.rows[0];
}

/**
 * Crear Devolución (Nota de Crédito DTE_06)
 * - Crea un nuevo documento DTE_06 relacionado a la factura
 * - Restaura el inventario
 * - Cancela la factura original
 */
export async function crearDevolucion(
  facturaId: number,
  tenantId: number
): Promise<FacturaResponse> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener factura original con sus detalles
    const facturaOriginal = await obtenerFacturaConDetalle(facturaId, tenantId);

    if (facturaOriginal.estado === 'cancelado') {
      throw new AppError('La factura ya se encuentra cancelada o devuelta', 400);
    }

    if (!facturaOriginal.punto_venta_id) {
      throw new AppError('La factura original no tiene punto de venta asignado', 400);
    }

    // 2. Determinar Tipo DTE (Nota de Crédito)
    const tipoDTE: TipoDTE = 'DTE_06';

    // 3. Obtener correlativo
    const numeroDTE = await obtenerSiguienteNumeroDTE(tipoDTE, facturaOriginal.punto_venta_id);
    const codigoGeneracion = randomUUID().toUpperCase();

    // 4. Fechas
    const ahora = new Date();
    const fechaEmision = ahora.toISOString().split('T')[0];

    // 5. Insertar Nota de Crédito en DB
    const facturaResult = await client.query<{ id: number; numero_dte: string }>(
      `INSERT INTO facturas (
        numero_dte, tipo_dte, cliente_id,
        receptor_nombre, receptor_correo, retencion_renta,
        fecha_emision, fecha_vencimiento,
        estado, subtotal, iva, total, notas,
        codigo_generacion, ambiente, condicion_operacion,
        punto_venta_id, metodo_pago, tenant_id, doc_relacionado_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'facturado', $9, $10, $11, $12, $13, '00', 1, $14, $15, $16, $17)
       RETURNING id, numero_dte`,
      [
        numeroDTE, tipoDTE, facturaOriginal.cliente_id,
        facturaOriginal.receptor_nombre, facturaOriginal.receptor_correo, facturaOriginal.retencion_renta,
        fechaEmision, null,
        facturaOriginal.subtotal, facturaOriginal.iva, facturaOriginal.total, 'Nota de Crédito de Devolución',
        codigoGeneracion, facturaOriginal.punto_venta_id, facturaOriginal.metodo_pago, tenantId, facturaId
      ]
    );

    const nuevaFacturaId = facturaResult.rows[0].id;

    const detallesConProducto: FacturaDetalleConProducto[] = [];

    // 6. Procesar detalles, insertar en nueva factura y restaurar stock
    for (const detalleOrig of facturaOriginal.detalles) {
      // Registrar detalle de la nota de crédito
      const detalleResult = await client.query<{ id: number; created_at: Date }>(
        `INSERT INTO factura_detalles (
          factura_id, producto_id, cantidad, precio_unitario,
          descuento, iva_unitario, subtotal, total_linea
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at`,
        [
          nuevaFacturaId, detalleOrig.producto_id, detalleOrig.cantidad, detalleOrig.precio_unitario,
          detalleOrig.descuento, detalleOrig.iva_unitario, detalleOrig.subtotal, detalleOrig.total_linea
        ]
      );

      // Restaurar inventario al lote exacto que fue descontado originalmente.
      // Si lote_inventario_id está disponible (facturas creadas desde FASE 6A),
      // se restaura el lote preciso. Para facturas antiguas sin trazabilidad,
      // se usa el lote más reciente como fallback.
      if (detalleOrig.lote_inventario_id) {
        await client.query(
          `UPDATE inventario SET cantidad = cantidad + $1 WHERE id = $2 AND tenant_id = $3`,
          [detalleOrig.cantidad, detalleOrig.lote_inventario_id, tenantId]
        );
      } else {
        // Fallback para facturas sin trazabilidad de lote (registros anteriores)
        await client.query(
          `UPDATE inventario
           SET cantidad = cantidad + $1
           WHERE id = (
             SELECT id FROM inventario WHERE producto_id = $2 AND tenant_id = $3 ORDER BY created_at DESC LIMIT 1
           )`,
          [detalleOrig.cantidad, detalleOrig.producto_id, tenantId]
        );
      }

      detallesConProducto.push({
        id: detalleResult.rows[0].id,
        factura_id: nuevaFacturaId,
        producto_id: detalleOrig.producto_id,
        producto_nombre: detalleOrig.producto_nombre,
        categoria_nombre: detalleOrig.categoria_nombre,
        cantidad: detalleOrig.cantidad,
        precio_unitario: detalleOrig.precio_unitario,
        descuento: detalleOrig.descuento,
        iva_unitario: detalleOrig.iva_unitario,
        subtotal: detalleOrig.subtotal,
        total_linea: detalleOrig.total_linea,
        lote_inventario_id: null,
        created_at: detalleResult.rows[0].created_at,
      });
    }

    // 7. Actualizar factura original a cancelada state
    await client.query(
      `UPDATE facturas SET estado = 'cancelado' WHERE id = $1 AND tenant_id = $2`,
      [facturaId, tenantId]
    );

    // 8. JSON (Simplified for now - we reuse DTE JSON generation)
    // In El Salvador MH, DTE_06 has slightly different nodes but generating the baseline is good.
    const empresaResult = await client.query(`
      SELECT
        ce.nombre_negocio, ce.nit, ce.ncr, ce.direccion, ce.telefono, ce.correo,
        ce.cod_actividad, ce.desc_actividad, ce.tipo_establecimiento,
        cd.codigo AS dep_codigo, cm.codigo AS mun_codigo
      FROM configuracion_empresa ce
      LEFT JOIN cat_departamentos cd ON cd.id = ce.departamento_id
      LEFT JOIN cat_municipios cm ON cm.id = ce.municipio_id
      WHERE ce.tenant_id = $1
    `, [tenantId]);
    const empresa = empresaResult.rows[0] || { nombre_negocio: 'Empresa', nit: null, ncr: null, direccion: null, telefono: null, correo: null, cod_actividad: null, desc_actividad: null, tipo_establecimiento: null, dep_codigo: null, mun_codigo: null };

    // Fake row based on original invoice info for generating JSON
    const clienteRow: any = {
      tipo_cliente: facturaOriginal.cliente_tipo || 'persona_natural',
      tipo_documento: 'Otro',
      nombre_completo: facturaOriginal.cliente_nombre || facturaOriginal.receptor_nombre || 'Consumidor Final',
      numero_documento: facturaOriginal.cliente_documento || '',
      nit: null, ncr: null, direccion: null, telefono: null, correo: facturaOriginal.receptor_correo || null,
      dep_codigo: null, mun_codigo: null
    };

    const dteModo = facturaOriginal.cliente_id ? 'C' : facturaOriginal.receptor_nombre ? 'B' : 'A';

    asegurarCarpetaJSONDTE();
    const jsonDTE = generarDTEJSON(
      numeroDTE, codigoGeneracion, tipoDTE, dteModo,
      empresa, clienteRow, fechaEmision, detallesConProducto,
      facturaOriginal.subtotal, facturaOriginal.iva, facturaOriginal.total, 0, facturaOriginal.retencion_renta
    );

    const jsonPDF = generarPDFVisualizacionJSON(
      numeroDTE, tipoDTE, dteModo, clienteRow, empresa,
      fechaEmision, undefined, detallesConProducto,
      facturaOriginal.subtotal, facturaOriginal.iva, facturaOriginal.total, 0, facturaOriginal.retencion_renta, 'Nota de crédito de devolución'
    );

    const nombreArchivoDTE = `dte_${numeroDTE.replace(/\//g, '_')}.json`;
    const nombreArchivoPDF = `pdf_visualizacion_${numeroDTE.replace(/\//g, '_')}.json`;
    fs.writeFileSync(path.join(CARPETA_JSONDTE, nombreArchivoDTE), JSON.stringify(jsonDTE, null, 2));
    fs.writeFileSync(path.join(CARPETA_JSONDTE, nombreArchivoPDF), JSON.stringify(jsonPDF, null, 2));

    await client.query(
      `UPDATE facturas SET json_dte_path = $1, json_pdf_path = $2 WHERE id = $3`,
      [nombreArchivoDTE, nombreArchivoPDF, nuevaFacturaId]
    );

    await client.query('COMMIT');

    const nuevaFacturaConDetalle: FacturaConDetalle = {
      id: nuevaFacturaId,
      numero_dte: numeroDTE,
      tipo_dte: tipoDTE,
      cliente_id: facturaOriginal.cliente_id,
      receptor_nombre: facturaOriginal.receptor_nombre,
      receptor_correo: facturaOriginal.receptor_correo,
      retencion_renta: facturaOriginal.retencion_renta,
      cliente_nombre: facturaOriginal.cliente_nombre,
      cliente_tipo: facturaOriginal.cliente_tipo,
      cliente_documento: facturaOriginal.cliente_documento,
      fecha_emision: fechaEmision,
      fecha_vencimiento: null,
      estado: 'facturado',
      subtotal: facturaOriginal.subtotal,
      iva: facturaOriginal.iva,
      total: facturaOriginal.total,
      notas: 'Nota de crédito',
      json_dte_path: nombreArchivoDTE,
      json_pdf_path: nombreArchivoPDF,
      codigo_generacion: codigoGeneracion,
      ambiente: '00',
      doc_relacionado_id: facturaId,
      condicion_operacion: 1,
      metodo_pago: facturaOriginal.metodo_pago,
      punto_venta_id: facturaOriginal.punto_venta_id,
      created_at: ahora,
      updated_at: ahora,
      detalles: detallesConProducto,
    };

    return {
      id: nuevaFacturaId,
      numero_dte: numeroDTE,
      tipo_dte: tipoDTE,
      factura: nuevaFacturaConDetalle,
      json_dte: jsonDTE,
      json_pdf: jsonPDF
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Helpers para JSON MH ──────────────────────────────────────────────────────

/** Mapeo tipo_documento → código CAT-022 del MH */
function tipoDocMH(tipoDoc: string): string {
  switch (tipoDoc) {
    case 'DUI': return '13';
    case 'NIT': return '36';
    case 'Pasaporte': return '03';
    default: return '37'; // Otros
  }
}

/** Convierte monto numérico a letras en español (ej: "DIEZ 00/100 DÓLARES") */
function numeroALetras(monto: number): string {
  const UNITS = [
    '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS',
    'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  ];
  const TENS = [
    '', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
    'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
  ];
  const HUNDREDS = [
    '', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
  ];

  function tresDigitos(n: number): string {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const t = Math.floor(rest / 10);
    const u = rest % 10;
    let r = '';
    if (h > 0) r += (h === 1 && rest > 0) ? 'CIENTO' : HUNDREDS[h];
    if (rest < 20) {
      if (rest > 0) r += (r ? ' ' : '') + UNITS[rest];
    } else {
      r += (r ? ' ' : '') + TENS[t];
      if (u > 0) r += ' Y ' + UNITS[u];
    }
    return r.trim();
  }

  const totalCents = Math.round(monto * 100);
  const entero = Math.floor(totalCents / 100);
  const centavos = totalCents % 100;

  let palabras = '';
  if (entero === 0) {
    palabras = 'CERO';
  } else if (entero < 1000) {
    palabras = tresDigitos(entero);
  } else if (entero < 1_000_000) {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    palabras = miles === 1 ? 'MIL' : tresDigitos(miles) + ' MIL';
    if (resto > 0) palabras += ' ' + tresDigitos(resto);
  } else {
    const millones = Math.floor(entero / 1_000_000);
    const resto = entero % 1_000_000;
    palabras = tresDigitos(millones) + (millones === 1 ? ' MILLÓN' : ' MILLONES');
    if (resto >= 1000) {
      const miles = Math.floor(resto / 1000);
      const r2 = resto % 1000;
      palabras += ' ' + (miles === 1 ? 'MIL' : tresDigitos(miles) + ' MIL');
      if (r2 > 0) palabras += ' ' + tresDigitos(r2);
    } else if (resto > 0) {
      palabras += ' ' + tresDigitos(resto);
    }
  }

  return `${palabras} ${String(centavos).padStart(2, '0')}/100 DÓLARES`;
}

/** round a number to 2 decimal places */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Generar JSON para Hacienda — estructura oficial MH El Salvador.
 *
 * Maneja los 3 modos de receptor:
 *   A = Clientes Varios: receptor con nombre="Consumidor Final", sin documento
 *   B = Datos transitorios: receptor con nombre y correo, sin documento
 *   C = Cliente registrado: receptor completo con documento
 *
 * Soporta descuentos por línea (montoDescu) y retención ISR (reteRenta).
 */
function generarDTEJSON(
  numeroDTE: string,
  codigoGeneracion: string,
  tipoDTE: TipoDTE,
  modo: ReceptorModo,
  empresa: {
    nombre_negocio: string; nit: string | null; ncr: string | null;
    direccion: string | null; telefono: string | null; correo: string | null;
    cod_actividad: string | null; desc_actividad: string | null;
    tipo_establecimiento: string | null;
    dep_codigo: string | null; mun_codigo: string | null;
  },
  cliente: {
    tipo_cliente: string; tipo_documento: string;
    nombre_completo: string; numero_documento: string;
    nit: string | null; ncr: string | null;
    direccion: string | null; telefono: string | null; correo: string | null;
    dep_codigo: string | null; mun_codigo: string | null;
  },
  fechaEmision: string,
  detalles: FacturaDetalleConProducto[],
  subtotal: number,    // ya descontado (suma de ventaGravada × cantidad)
  iva: number,
  total: number,
  totalDescuento: number,
  retencionRenta: number
): DTEJSON {
  const ahora = new Date();
  const horEmi = ahora.toTimeString().slice(0, 8);
  const tipoStr = tipoDTE.replace('DTE_', '');

  // ── Cuerpo del documento ──────────────────────────────────────────────────
  // precioUni = precio bruto (antes de descuento)
  // montoDescu = descuento por unidad
  // ventaGravada = (precioUni - montoDescu) × cantidad
  const cuerpo: DTELinea[] = detalles.map((d, i) => {
    const montoDescu = r2(d.descuento ?? 0);
    const precioNeto = r2(d.precio_unitario - montoDescu);
    const ventaGravada = r2(precioNeto * d.cantidad);
    return {
      numItem: i + 1,
      tipoItem: 1,        // bienes
      numeroDocumento: null,
      cantidad: d.cantidad,
      codigo: null,
      codTributo: null,
      uniMedida: 59,       // unidad (CAT-014)
      descripcion: d.producto_nombre,
      precioUni: r2(d.precio_unitario),
      montoDescu,
      ventaNoSuj: 0,
      ventaExenta: 0,
      ventaGravada,
      tributos: ['20'],   // IVA
      psv: 0,
      noGravado: 0,
    };
  });

  const totalGravada = r2(cuerpo.reduce((s, l) => s + l.ventaGravada, 0));

  // IVA embebido en DTE_01 (precio incluye IVA); desglosado en DTE_03
  const totalIva = tipoDTE === 'DTE_03'
    ? r2(totalGravada * 0.13)
    : r2(totalGravada * 13 / 113);

  const tributos: DTETributo[] = [{
    codigo: '20',
    descripcion: 'Impuesto al Valor Agregado 13%',
    valor: totalIva,
  }];

  const pagos: DTEPago[] = [{
    codigo: '01',  // efectivo
    montoPago: r2(total),
    referencia: null,
    plazo: null,
    periodo: null,
  }];

  // ── Receptor según modo ───────────────────────────────────────────────────
  //
  // Modo A y B (DTE_01): nombre obligatorio, tipoDocumento=null, numDocumento=null
  //   Spec. MH: nombre="Consumidor Final" para modo anónimo
  // Modo C (DTE_01 o DTE_03): receptor con datos reales del cliente
  let receptor: DTEJSON['receptor'];

  if (modo === 'A' || modo === 'B') {
    receptor = {
      tipoDocumento: null,
      numDocumento: null,
      nrc: null,
      nombre: cliente.nombre_completo,  // "Consumidor Final" o nombre transitorio
      codActividad: null,
      descActividad: null,
      nombreComercial: null,
      direccion: null,
      telefono: cliente.telefono ?? null,
      correo: cliente.correo ?? null,
    };
  } else {
    // Modo C: cliente registrado
    // Para DTE_03 el receptor debe tener NRC si es empresa
    const tipoDocCodigo = tipoDocMH(cliente.tipo_documento);
    // Para persona_natural con NIT, preferir el NIT como identificador
    const numDoc = cliente.nit ?? (cliente.numero_documento || null);
    const tipoDoc = cliente.nit ? '36' : (cliente.numero_documento ? tipoDocCodigo : null);

    receptor = {
      tipoDocumento: tipoDoc,
      numDocumento: numDoc,
      nrc: tipoDTE === 'DTE_03' ? (cliente.ncr ?? null) : null,
      nombre: cliente.nombre_completo,
      codActividad: null,
      descActividad: null,
      nombreComercial: null,
      direccion: cliente.dep_codigo
        ? {
          departamento: cliente.dep_codigo,
          municipio: cliente.mun_codigo ?? '20',
          complemento: cliente.direccion ?? '',
        }
        : null,
      telefono: cliente.telefono ?? null,
      correo: cliente.correo ?? null,
    };
  }

  return {
    identificacion: {
      version: 1,
      ambiente: '00',
      tipoDte: tipoStr,
      numeroControl: numeroDTE,
      codigoGeneracion: codigoGeneracion,
      tipoModelo: 1,
      tipoOperacion: 1,
      tipoContingencia: null,
      motivoContin: null,
      fecEmi: fechaEmision,
      horEmi,
      tipoMoneda: 'USD',
    },
    documentoRelacionado: null,
    emisor: {
      nit: empresa.nit ?? '',
      nrc: empresa.ncr ?? null,
      nombre: empresa.nombre_negocio,
      codActividad: empresa.cod_actividad ?? null,
      descActividad: empresa.desc_actividad ?? null,
      nombreComercial: null,
      tipoEstablecimiento: empresa.tipo_establecimiento ?? '02',
      codEstableMH: null,
      codEstable: null,
      codPuntoVentaMH: null,
      codPuntoVenta: null,
      telefono: empresa.telefono ?? null,
      correo: empresa.correo ?? null,
      direccion: {
        departamento: empresa.dep_codigo ?? '06',
        municipio: empresa.mun_codigo ?? '20',
        complemento: empresa.direccion ?? '',
      },
    },
    receptor,
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0,
      totalExenta: 0,
      totalGravada,
      subTotalVentas: totalGravada,
      descuNoSuj: 0,
      descuExenta: 0,
      // descuGravada = total de descuentos sobre ventas gravadas
      descuGravada: r2(totalDescuento),
      porcentajeDescuento: 0,   // MH acepta 0 si se usan montos por línea
      totalDescu: r2(totalDescuento),
      tributos,
      subTotal: totalGravada,
      ivaRete1: 0,
      // reteRenta: retención ISR 1% Art.156-A CT — solo DTE_03 grandes contribuyentes
      reteRenta: retencionRenta,
      // montoTotalOperacion ya incluye el descuento de la retención
      montoTotalOperacion: r2(total),
      totalLetras: numeroALetras(total),
      totalIva,
      saldoFavor: 0,
      condicionOperacion: 1,
      pagos,
      numPagoElectronico: null,
    },
    extension: null,
    apendice: null,
  };
}

/**
 * Generar JSON para visualización en PDF virtual.
 * Incluye datos de descuentos y retención ISR para mostrar en el visor.
 */
function generarPDFVisualizacionJSON(
  numeroDTE: string,
  tipoDTE: TipoDTE,
  modo: ReceptorModo,
  cliente: {
    tipo_cliente: string; nombre_completo: string; numero_documento: string;
    direccion: string | null; telefono: string | null; correo: string | null;
  },
  empresa: {
    nombre_negocio: string; nit: string | null;
    direccion: string | null; telefono: string | null; correo: string | null;
  },
  fechaEmision: string,
  fechaVencimiento: string | undefined,
  detalles: FacturaDetalleConProducto[],
  subtotal: number,
  iva: number,
  total: number,
  totalDescuento: number,
  retencionRenta: number,
  notas?: string
): PDFVisualizacionJSON {
  const tipoNombre = tipoDTE === 'DTE_01' ? 'Factura (Consumidor Final)' : 'Crédito Fiscal';

  // Nombre del receptor según modo
  const nombreReceptor = modo === 'A' ? 'Clientes Varios' : cliente.nombre_completo;
  const tipoReceptor = modo !== 'C' ? 'Consumidor Final'
    : (cliente.tipo_cliente === 'persona_natural' ? 'Persona Natural' : 'Empresa');

  return {
    numero_dte: numeroDTE,
    tipo_dte_nombre: tipoNombre,
    fecha_emision: fechaEmision,
    fecha_vencimiento: fechaVencimiento,
    numero_interno: `FC-${numeroDTE.split('-').pop()}`,

    emisor: {
      nombre_negocio: empresa.nombre_negocio,
      nit: empresa.nit ?? '',
      direccion: empresa.direccion ?? '',
      telefono: empresa.telefono ?? '',
      correo: empresa.correo ?? '',
    },

    cliente: {
      nombre: nombreReceptor,
      tipo_cliente: tipoReceptor,
      documento: modo === 'C' ? cliente.numero_documento : '',
      direccion: modo === 'C' ? (cliente.direccion ?? '') : '',
      telefono: modo === 'C' ? (cliente.telefono ?? '') : '',
      correo: cliente.correo ?? '',
    },

    lineas: detalles.map((detalle, index) => ({
      numero_linea: index + 1,
      codigo_producto: `P${detalle.producto_id}`,
      descripcion: detalle.producto_nombre,
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario,
      // descuento por unidad — para mostrar en el PDF
      descuento: (detalle.descuento ?? 0) > 0 ? r2(detalle.descuento * detalle.cantidad) : undefined,
      subtotal: detalle.subtotal,
      iva_linea: tipoDTE === 'DTE_03' ? r2(detalle.iva_unitario * detalle.cantidad) : undefined,
      total: detalle.total_linea,
    })),

    resumen: {
      subtotal,
      descuento: totalDescuento > 0 ? totalDescuento : undefined,
      iva: tipoDTE === 'DTE_03' ? iva : undefined,
      iva_porcentaje: tipoDTE === 'DTE_03' ? 13 : undefined,
      retencion_renta: retencionRenta > 0 ? retencionRenta : undefined,
      total,
      moneda: 'USD',
    },

    notas,
    pie_de_pagina: `Comprobante generado el ${new Date().toLocaleDateString('es-SV')}. ` +
      `Conserve este documento durante 5 años según lo establece la ley.`,
  };
}
