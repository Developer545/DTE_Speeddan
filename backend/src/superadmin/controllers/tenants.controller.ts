/**
 * tenants.controller.ts — Handlers HTTP para Tenants y toda su configuración.
 *
 * Rutas:
 *   GET  /superadmin/tenants                                    → getTenants
 *   POST /superadmin/tenants                                    → postTenant
 *   GET  /superadmin/tenants/:id                                → getTenantById
 *   PUT  /superadmin/tenants/:id                                → putTenant
 *   POST /superadmin/tenants/:id/impersonate                    → postImpersonate
 *   GET  /superadmin/tenants/:id/pagos                          → getPagos
 *   POST /superadmin/tenants/:id/pagos                          → postPago
 *   GET/PUT /superadmin/tenants/:id/api-mh                      → getApiMh / putApiMh
 *   GET/PUT /superadmin/tenants/:id/firma                       → getFirma / putFirma
 *   POST    /superadmin/tenants/:id/firma/upload                → postFirmaUpload
 *   GET/POST/PUT/DELETE /superadmin/tenants/:id/usuarios        → CRUD usuarios
 *   POST /superadmin/tenants/:id/usuarios/:userId/reset-password→ postResetPassword
 *   GET/PUT /superadmin/tenants/:id/dte/:tipo                   → getTenantDTE / putTenantDTE
 *   GET/POST/PUT/DELETE /superadmin/tenants/:id/sucursales      → CRUD sucursales
 *   GET/POST/PUT/DELETE /superadmin/tenants/:id/sucursales/:sucId/puntos-venta → CRUD PV
 *   GET/PUT /superadmin/tenants/:id/config/empresa              → empresa
 *   POST    /superadmin/tenants/:id/config/empresa/logo         → postTenantEmpresaLogo
 *   GET/PUT /superadmin/tenants/:id/config/tema                 → tema
 */

import path from 'path';
import fs   from 'fs';
import { Request, Response, NextFunction } from 'express';

import * as tenantsService from '../services/tenants.service';
import * as configSvc      from '../../services/config.service';
import { logAudit, AUDIT_ACCIONES } from '../../utils/audit';

// ═══════════════════════════════════════════════════════════════════════════════
// ── TENANTS ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants — Lista todos los tenants con plan y días para vencer. */
export async function getTenants(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenants = await tenantsService.getTenants();
    res.json(tenants);
  } catch (err) { next(err); }
}

/** GET /superadmin/tenants/:id — Detalle completo de un tenant. */
export async function getTenantById(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id     = parseInt(req.params.id as string, 10);
    const tenant = await tenantsService.getTenantById(id);
    if (!tenant) { res.status(404).json({ message: 'Tenant no encontrado' }); return; }
    res.json(tenant);
  } catch (err) { next(err); }
}

/** POST /superadmin/tenants — Crea un nuevo tenant con seed inicial (TX). */
export async function postTenant(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const result = await tenantsService.createTenant(req.body);

    await logAudit({
      actorId:   req.superAdmin!.id,
      actorTipo: 'superadmin',
      accion:    AUDIT_ACCIONES.CREAR_TENANT,
      tenantId:  result.tenant.id,
      detalle:   { nombre: result.tenant.nombre, slug: result.tenant.slug },
      ip:        req.ip,
    });

    res.status(201).json(result);
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id — Actualiza datos del tenant. Sincroniza API MH al cambiar estado. */
export async function putTenant(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id     = parseInt(req.params.id as string, 10);
    const tenant = await tenantsService.updateTenant(id, req.body);

    const accion = req.body.estado === 'suspendido'
      ? AUDIT_ACCIONES.SUSPENDER_TENANT
      : AUDIT_ACCIONES.ACTUALIZAR_TENANT;

    await logAudit({
      actorId:   req.superAdmin!.id,
      actorTipo: 'superadmin',
      accion,
      tenantId:  id,
      detalle:   req.body,
      ip:        req.ip,
    });

    res.json(tenant);
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── IMPERSONACIÓN ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /superadmin/tenants/:id/impersonate
 * Genera un token temporal (15 min) para que el superadmin entre al ERP del tenant.
 */
export async function postImpersonate(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const token    = await tenantsService.generarTokenImpersonacion(tenantId);

    await logAudit({
      actorId:   req.superAdmin!.id,
      actorTipo: 'superadmin',
      accion:    AUDIT_ACCIONES.IMPERSONAR_TENANT,
      tenantId,
      ip:        req.ip,
    });

    res.json({ token, expires_in: 900 });
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PAGOS ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/pagos — Historial de pagos de un tenant. */
export async function getPagos(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const pagos    = await tenantsService.getPagosByTenant(tenantId);
    res.json(pagos);
  } catch (err) { next(err); }
}

/** POST /superadmin/tenants/:id/pagos — Registra un pago del tenant. */
export async function postPago(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId     = parseInt(req.params.id as string, 10);
    const superAdminId = req.superAdmin!.id;
    const pago         = await tenantsService.registrarPago(tenantId, req.body, superAdminId);

    await logAudit({
      actorId:   superAdminId,
      actorTipo: 'superadmin',
      accion:    AUDIT_ACCIONES.REGISTRAR_PAGO,
      tenantId,
      detalle:   { monto: req.body.monto, metodo: req.body.metodo },
      ip:        req.ip,
    });

    res.status(201).json(pago);
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── API MH ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/api-mh — Config de API MH del tenant. */
export async function getApiMh(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const config   = await tenantsService.getApiMh(tenantId);
    res.json(config ?? {});
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/api-mh — Actualiza config de API MH del tenant. */
export async function putApiMh(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const result   = await tenantsService.updateApiMh(tenantId, req.body);
    res.json(result);
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── FIRMA DIGITAL ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/firma — Metadatos de la firma digital del tenant. */
export async function getFirma(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const firma    = await tenantsService.getFirma(tenantId);
    res.json(firma ?? {});
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/firma — Actualiza metadatos de la firma (NIT, pass, vencimiento). */
export async function putFirma(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const result   = await tenantsService.updateFirma(tenantId, req.body);
    res.json(result ?? {});
  } catch (err) { next(err); }
}

/** POST /superadmin/tenants/:id/firma/upload — Sube el certificado .p12/.pfx. */
export async function postFirmaUpload(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'No se recibió ningún archivo' }); return; }
    const tenantId = parseInt(req.params.id as string, 10);
    const result   = await tenantsService.uploadFirma(tenantId, req.file.originalname, req.file.path);
    res.json(result);
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── USUARIOS DEL TENANT ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/usuarios — Lista usuarios del tenant. */
export async function getTenantUsuarios(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const usuarios = await configSvc.getUsuarios(tenantId);
    res.json(usuarios);
  } catch (err) { next(err); }
}

/** POST /superadmin/tenants/:id/usuarios — Crea un usuario en el tenant. */
export async function postTenantUsuario(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const usuario  = await configSvc.createUsuario(req.body, tenantId);

    await logAudit({
      actorId:   req.superAdmin!.id,
      actorTipo: 'superadmin',
      accion:    AUDIT_ACCIONES.CREAR_USUARIO,
      tenantId,
      detalle:   { username: req.body.username, rol: req.body.rol },
      ip:        req.ip,
    });

    res.status(201).json(usuario);
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/usuarios/:userId — Actualiza usuario del tenant. */
export async function putTenantUsuario(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id     as string, 10);
    const userId   = parseInt(req.params.userId as string, 10);
    const updated  = await configSvc.updateUsuario(userId, req.body, tenantId);
    if (!updated) { res.status(404).json({ message: 'Usuario no encontrado' }); return; }
    res.json(updated);
  } catch (err) { next(err); }
}

/** DELETE /superadmin/tenants/:id/usuarios/:userId — Elimina usuario del tenant. */
export async function deleteTenantUsuario(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id     as string, 10);
    const userId   = parseInt(req.params.userId as string, 10);
    const ok       = await configSvc.deleteUsuario(userId, tenantId);
    if (!ok) { res.status(404).json({ message: 'Usuario no encontrado' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
}

/**
 * POST /superadmin/tenants/:id/usuarios/:userId/reset-password
 * Genera una contraseña temporal y la devuelve en texto plano para comunicarla al cliente.
 */
export async function postResetPassword(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id     as string, 10);
    const userId   = parseInt(req.params.userId as string, 10);

    const result = await tenantsService.resetUsuarioPassword(userId, tenantId);

    await logAudit({
      actorId:   req.superAdmin!.id,
      actorTipo: 'superadmin',
      accion:    AUDIT_ACCIONES.RESET_PASSWORD,
      tenantId,
      detalle:   { userId, username: result.username },
      ip:        req.ip,
    });

    res.json({
      username:       result.username,
      nueva_password: result.nueva_password,
      mensaje:        'Contraseña reseteada. Comunica esta contraseña al cliente.',
    });
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── DTE CORRELATIVOS ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/dte — Configuración DTE del tenant. */
export async function getTenantDTE(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const dte      = await configSvc.getDTEConfigs(tenantId);
    res.json(dte);
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/dte/:tipo — Actualiza un correlativo DTE del tenant. */
export async function putTenantDTE(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const tipo     = req.params.tipo as string;
    const { prefijo, numero_actual } = req.body;
    const result   = await configSvc.updateDTEConfig(tipo, { prefijo, numero_actual }, tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── SUCURSALES ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/sucursales — Lista sucursales del tenant. */
export async function getTenantSucursales(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId   = parseInt(req.params.id as string, 10);
    const sucursales = await configSvc.getSucursales(tenantId);
    res.json(sucursales);
  } catch (err) { next(err); }
}

/** POST /superadmin/tenants/:id/sucursales — Crea sucursal del tenant. */
export async function postTenantSucursal(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const result   = await configSvc.createSucursal(req.body, tenantId);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/sucursales/:sucId — Actualiza sucursal del tenant. */
export async function putTenantSucursal(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id    as string, 10);
    const sucId    = parseInt(req.params.sucId as string, 10);
    const result   = await configSvc.updateSucursal(sucId, req.body, tenantId);
    if (!result) { res.status(404).json({ message: 'Sucursal no encontrada' }); return; }
    res.json(result);
  } catch (err) { next(err); }
}

/** DELETE /superadmin/tenants/:id/sucursales/:sucId — Elimina sucursal del tenant. */
export async function deleteTenantSucursal(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id    as string, 10);
    const sucId    = parseInt(req.params.sucId as string, 10);
    const ok       = await configSvc.deleteSucursal(sucId, tenantId);
    if (!ok) { res.status(404).json({ message: 'Sucursal no encontrada' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PUNTOS DE VENTA ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/sucursales/:sucId/puntos-venta — Lista puntos de venta. */
export async function getTenantPuntosVenta(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id    as string, 10);
    const sucId    = parseInt(req.params.sucId as string, 10);
    const list     = await configSvc.getPuntosVentaBySucursal(sucId, tenantId);
    res.json(list);
  } catch (err) { next(err); }
}

/** POST /superadmin/tenants/:id/sucursales/:sucId/puntos-venta — Crea punto de venta. */
export async function postTenantPuntoVenta(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id    as string, 10);
    const sucId    = parseInt(req.params.sucId as string, 10);
    const result   = await configSvc.createPuntoVenta({ ...req.body, sucursal_id: sucId }, tenantId);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/sucursales/:sucId/puntos-venta/:pvId — Actualiza punto de venta. */
export async function putTenantPuntoVenta(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id   as string, 10);
    const pvId     = parseInt(req.params.pvId as string, 10);
    const result   = await configSvc.updatePuntoVenta(pvId, req.body, tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** DELETE /superadmin/tenants/:id/sucursales/:sucId/puntos-venta/:pvId — Elimina punto de venta. */
export async function deleteTenantPuntoVenta(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id   as string, 10);
    const pvId     = parseInt(req.params.pvId as string, 10);
    const ok       = await configSvc.deletePuntoVenta(pvId, tenantId);
    if (!ok) { res.status(404).json({ message: 'Punto de venta no encontrado' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── EMPRESA Y TEMA ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /superadmin/tenants/:id/config/empresa — Config empresa del tenant. */
export async function getTenantEmpresa(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const empresa  = await configSvc.getEmpresa(tenantId);
    res.json(empresa ?? {});
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/config/empresa — Actualiza config empresa del tenant. */
export async function putTenantEmpresa(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const result   = await configSvc.updateEmpresa(req.body, tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/** POST /superadmin/tenants/:id/config/empresa/logo — Sube el logo de la empresa. */
export async function postTenantEmpresaLogo(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'No se recibió ningún archivo' }); return; }

    const tenantId  = parseInt(req.params.id as string, 10);
    const ext       = path.extname(req.file.filename).toLowerCase();
    const finalName = `logo${ext}`;
    const dir       = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'empresa', `tenant-${tenantId}`);
    const tmpPath   = path.join(dir, req.file.filename);
    const finalPath = path.join(dir, finalName);

    // Eliminar logos anteriores antes de renombrar el nuevo
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter(f => f.startsWith('logo.'))
        .forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch {} });
    }
    fs.renameSync(tmpPath, finalPath);

    res.json(await configSvc.updateEmpresaLogo(
      `/uploads/empresa/tenant-${tenantId}/${finalName}`,
      tenantId,
    ));
  } catch (err) { next(err); }
}

/** GET /superadmin/tenants/:id/config/tema — Tema visual del tenant. */
export async function getTenantTema(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const tema     = await configSvc.getTema(tenantId);
    res.json(tema ?? {});
  } catch (err) { next(err); }
}

/** PUT /superadmin/tenants/:id/config/tema — Actualiza el tema visual del tenant. */
export async function putTenantTema(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = parseInt(req.params.id as string, 10);
    const result   = await configSvc.updateTema(req.body, tenantId);
    res.json(result);
  } catch (err) { next(err); }
}
