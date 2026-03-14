/**
 * facturacion.routes.ts — Rutas del módulo POS / Facturación Electrónica.
 *
 * Endpoints:
 *   POST   /          - Crear factura
 *   GET    /          - Listar facturas
 *   GET    /:id       - Obtener factura
 *   PUT    /:id/marcar-facturado - Marcar como facturado
 *   PUT    /:id/cancelar          - Cancelar factura
 *   GET    /:id/json-dte          - Descargar JSON DTE
 *   GET    /:id/json-pdf          - Descargar JSON PDF
 */

import express from 'express';
import {
  createFactura,
  getFacturas,
  getFacturaById,
  putMarcarFacturado,
  putCancelarFactura,
  getJsonDTE,
  getJsonPDF,
  postDevolucion,
} from '../controllers/facturacion.controller';
import { facturacionLimiter, jsonDteLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Crear nueva factura — limitado a 60/10min para prevenir generación masiva accidental
router.post('/', facturacionLimiter, createFactura);

// Listar facturas
router.get('/', getFacturas);

// Obtener factura por ID
router.get('/:id', getFacturaById);

// Marcar como facturado
router.put('/:id/marcar-facturado', putMarcarFacturado);

// Cancelar factura
router.put('/:id/cancelar', putCancelarFactura);

// Devolución (Nota de Crédito DTE_06)
router.post('/:id/devolucion', facturacionLimiter, postDevolucion);

// Descargar JSON para Hacienda — limitado para prevenir scraping masivo
router.get('/:id/json-dte', jsonDteLimiter, getJsonDTE);

// Descargar JSON para PDF virtual
router.get('/:id/json-pdf', getJsonPDF);

export default router;
