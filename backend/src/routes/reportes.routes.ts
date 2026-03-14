/**
 * reportes.routes.ts — Rutas del módulo de reportes ERP.
 * Todas requieren autenticación (montadas bajo requireAuth en routes/index.ts).
 */

import { Router } from 'express';
import * as ctrl from '../controllers/reportes.controller';

const router = Router();

// ── Ventas ────────────────────────────────────────────────────────────────────
router.get('/ventas',             ctrl.getVentas);
router.get('/ventas/top-clientes',  ctrl.getTopClientes);
router.get('/ventas/top-productos', ctrl.getTopProductos);
router.get('/ventas/por-tipo',      ctrl.getVentasPorTipo);
router.get('/ventas/excel',         ctrl.getVentasExcel);

// ── Inventario ────────────────────────────────────────────────────────────────
router.get('/inventario/stock',           ctrl.getInventarioStock);
router.get('/inventario/sin-stock',       ctrl.getProductosSinStock);
router.get('/inventario/lotes-por-vencer', ctrl.getLotesPorVencer);
router.get('/inventario/excel',           ctrl.getInventarioExcel);

// ── Compras ────────────────────────────────────────────────────────────────────
router.get('/compras',                    ctrl.getComprasReporte);
router.get('/compras/top-proveedores',    ctrl.getTopProveedores);
router.get('/compras/por-estado',         ctrl.getComprasPorEstado);
router.get('/compras/excel',              ctrl.getComprasExcel);

export default router;
