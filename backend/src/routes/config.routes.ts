/**
 * config.routes.ts — Rutas para /api/config
 */

import { Router } from 'express';
import * as ctrl from '../controllers/config.controller';

const router = Router();

// Empresa
router.get('/empresa',                              ctrl.getEmpresa);
router.put('/empresa',                              ctrl.putEmpresa);
router.post('/empresa/logo', ctrl.uploadLogoMiddleware, ctrl.postEmpresaLogo);

// Tema
router.get('/tema',     ctrl.getTema);
router.put('/tema',     ctrl.putTema);

// DTE Correlativos
router.get('/dte',          ctrl.getDTE);
router.put('/dte/:tipo',    ctrl.putDTE);

// Usuarios
router.get('/usuarios/limite', ctrl.getLimiteUsuarios);   // antes de /:id para evitar conflicto
router.get('/usuarios',        ctrl.getUsuarios);
router.post('/usuarios',       ctrl.postUsuario);
router.put('/usuarios/:id',    ctrl.putUsuario);
router.delete('/usuarios/:id', ctrl.removeUsuario);

// Sucursales
router.get('/sucursales',         ctrl.getSucursales);
router.post('/sucursales',        ctrl.postSucursal);
router.put('/sucursales/:id',     ctrl.putSucursal);
router.delete('/sucursales/:id',  ctrl.removeSucursal);

// Puntos de Venta
router.get('/puntos-venta',         ctrl.getPuntosVenta);
router.post('/puntos-venta',        ctrl.postPuntoVenta);
router.put('/puntos-venta/:id',     ctrl.putPuntoVenta);
router.delete('/puntos-venta/:id',  ctrl.removePuntoVenta);

// API Hacienda
router.get('/api-mh',  ctrl.getAPIMH);
router.put('/api-mh',  ctrl.putAPIMH);

// Firma Electrónica
router.get('/firma',                                        ctrl.getFirma);
router.put('/firma',                                        ctrl.putFirma);
router.post('/firma/certificado', ctrl.uploadFirmaMiddleware, ctrl.postFirmaCertificado);

export default router;
