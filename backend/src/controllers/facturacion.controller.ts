/**
 * facturacion.controller.ts — Endpoints REST para Facturación Electrónica.
 *
 * Rutas disponibles:
 *   POST   /facturas                 - Crear nueva factura
 *   GET    /facturas                 - Listar facturas con paginación
 *   GET    /facturas/:id             - Obtener factura con detalles
 *   PUT    /facturas/:id/marcar-facturado - Cambiar estado a facturado
 *   PUT    /facturas/:id/cancelar    - Cambiar estado a cancelado
 *   GET    /facturas/:id/json-dte    - Descargar JSON para Hacienda
 *   GET    /facturas/:id/json-pdf    - Descargar JSON para PDF virtual
 */

import { Request, Response, NextFunction } from 'express';
import {
  crearFactura,
  obtenerFacturaConDetalle,
  listarFacturas,
  marcarFacturado,
  cancelarFactura,
  crearDevolucion,
} from '../services/facturacion.service';
import { CreateFacturaDTO } from '../models/facturacion.model';
import { AppError } from '../middleware/errorHandler';
import fs from 'fs';
import path from 'path';

const CARPETA_JSONDTE = path.join(__dirname, '..', '..', '..', 'jsonDTE');

/**
 * POST /api/facturas
 * Crear nueva factura
 */
export async function createFactura(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateFacturaDTO = req.body;

    // Validación básica
    if (!dto.punto_venta_id) {
      throw new AppError('punto_venta_id es requerido', 400);
    }
    if (!dto.fecha_emision || !dto.detalles || dto.detalles.length === 0) {
      throw new AppError('Datos requeridos: fecha_emision, detalles[]', 400);
    }

    // receptor_modo por defecto 'C' para compatibilidad con clientes que no lo envíen
    if (!dto.receptor_modo) dto.receptor_modo = 'C';

    // Modo C requiere cliente_id
    if (dto.receptor_modo === 'C' && !dto.cliente_id) {
      throw new AppError('Modo C (cliente registrado) requiere cliente_id', 400);
    }

    // Modo B requiere al menos receptor_nombre
    if (dto.receptor_modo === 'B' && !dto.receptor_nombre) {
      throw new AppError('Modo B (datos transitorios) requiere receptor_nombre', 400);
    }

    const respuesta = await crearFactura(dto, req.user!.tenantId);
    res.status(201).json(respuesta);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/facturas
 * Listar facturas con búsqueda y paginación
 */
export async function getFacturas(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search = '', page = '1', limit = '10' } = req.query;

    const respuesta = await listarFacturas({
      search: String(search),
      page: parseInt(String(page), 10),
      limit: parseInt(String(limit), 10),
    }, req.user!.tenantId);

    res.status(200).json(respuesta);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/facturas/:id
 * Obtener factura con todos sus detalles
 */
export async function getFacturaById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      throw new AppError('ID de factura inválido', 400);
    }

    const factura = await obtenerFacturaConDetalle(id, req.user!.tenantId);
    res.status(200).json(factura);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/facturas/:id/marcar-facturado
 * Cambiar estado de 'borrador' a 'facturado'
 */
export async function putMarcarFacturado(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      throw new AppError('ID de factura inválido', 400);
    }

    const factura = await marcarFacturado(id, req.user!.tenantId);
    res.status(200).json({ message: 'Factura marcada como facturada', factura });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/facturas/:id/cancelar
 * Cambiar estado a 'cancelado'
 */
export async function putCancelarFactura(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      throw new AppError('ID de factura inválido', 400);
    }

    const factura = await cancelarFactura(id, req.user!.tenantId);
    res.status(200).json({ message: 'Factura cancelada', factura });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/facturas/:id/devolucion
 * Generar Devolución (Nota de Crédito DTE_06)
 */
export async function postDevolucion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      throw new AppError('ID de factura inválido', 400);
    }

    const respuesta = await crearDevolucion(id, req.user!.tenantId);
    res.status(201).json(respuesta);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/facturas/:id/json-dte
 * Obtener JSON para Hacienda (DTE)
 */
export async function getJsonDTE(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      throw new AppError('ID de factura inválido', 400);
    }

    const factura = await obtenerFacturaConDetalle(id, req.user!.tenantId);

    if (!factura.json_dte_path) {
      throw new AppError('JSON DTE no disponible para esta factura', 404);
    }

    const rutaArchivo = path.join(CARPETA_JSONDTE, factura.json_dte_path);

    if (!fs.existsSync(rutaArchivo)) {
      throw new AppError('Archivo JSON DTE no encontrado', 404);
    }

    const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${factura.numero_dte}_dte.json"`
    );
    res.status(200).send(contenido);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/facturas/:id/json-pdf
 * Obtener JSON para visualización PDF virtual
 */
export async function getJsonPDF(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      throw new AppError('ID de factura inválido', 400);
    }

    const factura = await obtenerFacturaConDetalle(id, req.user!.tenantId);

    if (!factura.json_pdf_path) {
      throw new AppError('JSON PDF no disponible para esta factura', 404);
    }

    const rutaArchivo = path.join(CARPETA_JSONDTE, factura.json_pdf_path);

    if (!fs.existsSync(rutaArchivo)) {
      throw new AppError('Archivo JSON PDF no encontrado', 404);
    }

    const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${factura.numero_dte}_pdf.json"`
    );
    res.status(200).send(contenido);
  } catch (error) {
    next(error);
  }
}
