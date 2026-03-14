/**
 * tenants.routes.ts — Rutas de Tenants y toda su configuración.
 * Montadas en /superadmin (ver index.ts).
 *
 * Todas protegidas con requireSuperAdmin:
 *
 *   Catálogos globales:
 *     GET/POST/PUT/DELETE /departamentos
 *     GET/POST/PUT/DELETE /municipios
 *
 *   CRUD Tenants:
 *     GET    /tenants
 *     POST   /tenants
 *     GET    /tenants/:id
 *     PUT    /tenants/:id
 *     POST   /tenants/:id/impersonate
 *
 *   Pagos:
 *     GET/POST /tenants/:id/pagos
 *
 *   API MH:
 *     GET/PUT /tenants/:id/api-mh
 *
 *   Firma digital:
 *     GET/PUT  /tenants/:id/firma
 *     POST     /tenants/:id/firma/upload
 *
 *   Usuarios:
 *     GET/POST /tenants/:id/usuarios
 *     PUT/DELETE /tenants/:id/usuarios/:userId
 *     POST /tenants/:id/usuarios/:userId/reset-password
 *
 *   DTE correlativos:
 *     GET /tenants/:id/dte
 *     PUT /tenants/:id/dte/:tipo
 *
 *   Sucursales:
 *     GET/POST/PUT/DELETE /tenants/:id/sucursales
 *     GET/POST/PUT/DELETE /tenants/:id/sucursales/:sucId/puntos-venta
 *
 *   Empresa y Tema:
 *     GET/PUT  /tenants/:id/config/empresa
 *     POST     /tenants/:id/config/empresa/logo
 *     GET/PUT  /tenants/:id/config/tema
 */

import { Router } from 'express';

import { validateZod }   from '../../middleware/validate';
import { createTenantLimiter } from '../../middleware/rateLimiter';
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  RegistrarPagoSchema,
  CreateUsuarioTenantSchema,
  UpdateUsuarioTenantSchema,
} from '../../middleware/schemas';
import {
  listDepartamentos, addDepartamento, editDepartamento, removeDepartamento,
  listMunicipios, addMunicipio, editMunicipio, removeMunicipio,
} from '../../controllers/catalog.controller';
import { uploadFirmaMiddleware, uploadTenantLogoMiddleware } from '../middleware/upload.middleware';
import * as tenantsCtrl from '../controllers/tenants.controller';

const router = Router();

// ── Catálogos globales ────────────────────────────────────────────────────────
router.get   ('/departamentos',     listDepartamentos);
router.post  ('/departamentos',     addDepartamento);
router.put   ('/departamentos/:id', editDepartamento);
router.delete('/departamentos/:id', removeDepartamento);

router.get   ('/municipios',     listMunicipios);
router.post  ('/municipios',     addMunicipio);
router.put   ('/municipios/:id', editMunicipio);
router.delete('/municipios/:id', removeMunicipio);

// ── CRUD Tenants ──────────────────────────────────────────────────────────────
router.get   ('/tenants',     tenantsCtrl.getTenants);
router.post  ('/tenants',     createTenantLimiter, validateZod(CreateTenantSchema), tenantsCtrl.postTenant);
router.get   ('/tenants/:id', tenantsCtrl.getTenantById);
router.put   ('/tenants/:id', validateZod(UpdateTenantSchema), tenantsCtrl.putTenant);

// ── Impersonación ─────────────────────────────────────────────────────────────
router.post('/tenants/:id/impersonate', tenantsCtrl.postImpersonate);

// ── Pagos ─────────────────────────────────────────────────────────────────────
router.get ('/tenants/:id/pagos', tenantsCtrl.getPagos);
router.post('/tenants/:id/pagos', validateZod(RegistrarPagoSchema), tenantsCtrl.postPago);

// ── API MH ────────────────────────────────────────────────────────────────────
router.get('/tenants/:id/api-mh', tenantsCtrl.getApiMh);
router.put('/tenants/:id/api-mh', tenantsCtrl.putApiMh);

// ── Firma digital ─────────────────────────────────────────────────────────────
router.get ('/tenants/:id/firma',         tenantsCtrl.getFirma);
router.put ('/tenants/:id/firma',         tenantsCtrl.putFirma);
router.post('/tenants/:id/firma/upload',  uploadFirmaMiddleware, tenantsCtrl.postFirmaUpload);

// ── Usuarios ──────────────────────────────────────────────────────────────────
router.get   ('/tenants/:id/usuarios',                         tenantsCtrl.getTenantUsuarios);
router.post  ('/tenants/:id/usuarios',                         validateZod(CreateUsuarioTenantSchema), tenantsCtrl.postTenantUsuario);
router.put   ('/tenants/:id/usuarios/:userId',                 validateZod(UpdateUsuarioTenantSchema), tenantsCtrl.putTenantUsuario);
router.delete('/tenants/:id/usuarios/:userId',                 tenantsCtrl.deleteTenantUsuario);
router.post  ('/tenants/:id/usuarios/:userId/reset-password',  tenantsCtrl.postResetPassword);

// ── DTE correlativos ──────────────────────────────────────────────────────────
router.get('/tenants/:id/dte',       tenantsCtrl.getTenantDTE);
router.put('/tenants/:id/dte/:tipo', tenantsCtrl.putTenantDTE);

// ── Sucursales ────────────────────────────────────────────────────────────────
router.get   ('/tenants/:id/sucursales',             tenantsCtrl.getTenantSucursales);
router.post  ('/tenants/:id/sucursales',             tenantsCtrl.postTenantSucursal);
router.put   ('/tenants/:id/sucursales/:sucId',      tenantsCtrl.putTenantSucursal);
router.delete('/tenants/:id/sucursales/:sucId',      tenantsCtrl.deleteTenantSucursal);

// ── Puntos de venta ───────────────────────────────────────────────────────────
router.get   ('/tenants/:id/sucursales/:sucId/puntos-venta',         tenantsCtrl.getTenantPuntosVenta);
router.post  ('/tenants/:id/sucursales/:sucId/puntos-venta',         tenantsCtrl.postTenantPuntoVenta);
router.put   ('/tenants/:id/sucursales/:sucId/puntos-venta/:pvId',   tenantsCtrl.putTenantPuntoVenta);
router.delete('/tenants/:id/sucursales/:sucId/puntos-venta/:pvId',   tenantsCtrl.deleteTenantPuntoVenta);

// ── Empresa y Tema ────────────────────────────────────────────────────────────
router.get ('/tenants/:id/config/empresa',       tenantsCtrl.getTenantEmpresa);
router.put ('/tenants/:id/config/empresa',       tenantsCtrl.putTenantEmpresa);
router.post('/tenants/:id/config/empresa/logo',  uploadTenantLogoMiddleware, tenantsCtrl.postTenantEmpresaLogo);
router.get ('/tenants/:id/config/tema',          tenantsCtrl.getTenantTema);
router.put ('/tenants/:id/config/tema',          tenantsCtrl.putTenantTema);

export default router;
