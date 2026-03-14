/**
 * config.controller.ts — Handlers HTTP para /api/config
 *
 *  GET  /api/config/empresa          → getEmpresa
 *  PUT  /api/config/empresa          → putEmpresa
 *  POST /api/config/empresa/logo     → postEmpresaLogo
 *  GET  /api/config/tema             → getTema
 *  PUT  /api/config/tema             → putTema
 *  GET  /api/config/dte              → getDTE
 *  PUT  /api/config/dte/:tipo        → putDTE
 *  GET  /api/config/usuarios         → getUsuarios
 *  POST /api/config/usuarios         → postUsuario
 *  PUT  /api/config/usuarios/:id     → putUsuario
 *  DELETE /api/config/usuarios/:id   → deleteUsuario
 *  GET  /api/config/sucursales       → getSucursales
 *  POST /api/config/sucursales       → postSucursal
 *  PUT  /api/config/sucursales/:id   → putSucursal
 *  DELETE /api/config/sucursales/:id → removeSucursal
 *  GET  /api/config/puntos-venta     → getPuntosVenta
 *  POST /api/config/puntos-venta     → postPuntoVenta
 *  PUT  /api/config/puntos-venta/:id → putPuntoVenta
 *  DELETE /api/config/puntos-venta/:id → removePuntoVenta
 *  GET  /api/config/api-mh           → getAPIMH (solo lectura)
 *  GET  /api/config/firma            → getFirma (solo lectura)
 */

import path   from 'path';
import fs     from 'fs';
import { Request, Response, NextFunction } from 'express';
import multer  from 'multer';
import * as svc from '../services/config.service';
import { AppError } from '../middleware/errorHandler';
import { pool } from '../config/database';

// ── Multer para logo de empresa ───────────────────────────────────────────────

const LOGO_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'empresa');

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(LOGO_DIR, { recursive: true });
    cb(null, LOGO_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-tmp${ext}`);
  },
});

export const uploadLogoMiddleware = multer({
  storage: logoStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new AppError('Solo JPG, PNG, SVG o WebP', 400));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('logo');

// ── Empresa ──────────────────────────────────────────────────────────────────

export async function getEmpresa(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getEmpresa(req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function putEmpresa(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body.nombre_negocio) throw new AppError('nombre_negocio es requerido', 400);
    res.json(await svc.updateEmpresa(req.body, req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function postEmpresaLogo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No se recibió ningún archivo', 400);

    const ext       = path.extname(req.file.filename).toLowerCase();
    const finalName = `logo${ext}`;
    const tmpPath   = path.join(LOGO_DIR, req.file.filename);
    const finalPath = path.join(LOGO_DIR, finalName);

    // Eliminar logos anteriores con cualquier extensión
    if (fs.existsSync(LOGO_DIR)) {
      fs.readdirSync(LOGO_DIR)
        .filter(f => f.startsWith('logo.'))
        .forEach(f => { try { fs.unlinkSync(path.join(LOGO_DIR, f)); } catch {} });
    }

    fs.renameSync(tmpPath, finalPath);
    res.json(await svc.updateEmpresaLogo(`/uploads/empresa/${finalName}`, req.user!.tenantId));
  } catch (e) { next(e); }
}

// ── Tema ─────────────────────────────────────────────────────────────────────

export async function getTema(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getTema(req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function putTema(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.updateTema(req.body, req.user!.tenantId));
  } catch (e) { next(e); }
}

// ── DTE Correlativos ──────────────────────────────────────────────────────────

export async function getDTE(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getDTEConfigs(req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function putDTE(req: Request, res: Response, next: NextFunction) {
  try {
    const tipo = req.params.tipo as string;
    if (!['DTE_01', 'DTE_03', 'DTE_05', 'DTE_06', 'DTE_11'].includes(tipo))
      throw new AppError('Tipo DTE inválido', 400);
    res.json(await svc.updateDTEConfig(tipo, req.body, req.user!.tenantId));
  } catch (e) { next(e); }
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

export async function getUsuarios(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getUsuarios(req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function postUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre, username, password, rol } = req.body;
    if (!nombre || !username || !password || !rol) {
      throw new AppError('nombre, username, password y rol son requeridos', 400);
    }

    const tenantId = req.user!.tenantId;

    // Verificar límite de usuarios (COALESCE: override tenant > límite del plan)
    const { rows: limitRows } = await pool.query(
      `SELECT COALESCE(t.max_usuarios, p.max_usuarios) AS lim
       FROM tenants t LEFT JOIN planes p ON p.id = t.plan_id
       WHERE t.id = $1`,
      [tenantId]
    );
    const limite = limitRows[0]?.lim as number | null;
    if (limite !== null && limite !== undefined) {
      const { rows: cnt } = await pool.query(
        `SELECT COUNT(*) AS c FROM usuarios WHERE tenant_id = $1`,
        [tenantId]
      );
      if (parseInt(cnt[0].c, 10) >= limite) {
        throw new AppError(
          `Has alcanzado el límite de ${limite} usuario${limite !== 1 ? 's' : ''} de tu plan. ` +
          `Para agregar más, comunícate con soporte.`,
          403
        );
      }
    }

    res.status(201).json(await svc.createUsuario({ nombre, username, password, rol }, tenantId));
  } catch (e) { next(e); }
}

export async function getLimiteUsuarios(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(t.max_usuarios, p.max_usuarios) AS max
       FROM tenants t LEFT JOIN planes p ON p.id = t.plan_id
       WHERE t.id = $1`,
      [req.user!.tenantId]
    );
    res.json({ max: rows[0]?.max ?? null });
  } catch (e) { next(e); }
}

export async function putUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    // Solo admins pueden cambiar contraseñas
    if (req.body.password && req.user?.rol !== 'admin') {
      throw new AppError('Solo un administrador puede cambiar contraseñas', 403);
    }

    res.json(await svc.updateUsuario(id, req.body, req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function removeUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const ok = await svc.deleteUsuario(id, req.user!.tenantId);
    if (!ok) throw new AppError('Usuario no encontrado', 404);
    res.status(204).send();
  } catch (e) { next(e); }
}

// ── Sucursales ────────────────────────────────────────────────────────────────

export async function getSucursales(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getSucursales(req.user!.tenantId)); } catch (e) { next(e); }
}

export async function postSucursal(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body.nombre || !req.body.codigo) throw new AppError('nombre y codigo son requeridos', 400);

    const tenantId = req.user!.tenantId;

    // Verificar límite de sucursales (COALESCE: override tenant > límite del plan)
    const { rows: limitRows } = await pool.query(
      `SELECT COALESCE(t.max_sucursales, p.max_sucursales) AS lim
       FROM tenants t LEFT JOIN planes p ON p.id = t.plan_id
       WHERE t.id = $1`,
      [tenantId]
    );
    const limite = limitRows[0]?.lim as number | null;
    if (limite !== null && limite !== undefined) {
      const { rows: cnt } = await pool.query(
        `SELECT COUNT(*) AS c FROM sucursales WHERE tenant_id = $1`,
        [tenantId]
      );
      if (parseInt(cnt[0].c, 10) >= limite) {
        throw new AppError(
          `Has alcanzado el límite de ${limite} sucursal${limite !== 1 ? 'es' : ''} de tu plan. ` +
          `Para agregar más, comunícate con soporte.`,
          403
        );
      }
    }

    res.status(201).json(await svc.createSucursal(req.body, tenantId));
  } catch (e) { next(e); }
}

export async function putSucursal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    res.json(await svc.updateSucursal(id, req.body, req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function removeSucursal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const ok = await svc.deleteSucursal(id, req.user!.tenantId);
    if (!ok) throw new AppError('Sucursal no encontrada', 404);
    res.status(204).send();
  } catch (e) { next(e); }
}

// ── Puntos de Venta ───────────────────────────────────────────────────────────

export async function getPuntosVenta(req: Request, res: Response, next: NextFunction) {
  try {
    const sucursalId = req.query.sucursalId ? parseInt(req.query.sucursalId as string, 10) : undefined;
    if (sucursalId) {
      res.json(await svc.getPuntosVentaBySucursal(sucursalId, req.user!.tenantId));
    } else {
      res.json(await svc.getAllPuntosVenta(req.user!.tenantId));
    }
  } catch (e) { next(e); }
}

export async function postPuntoVenta(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body.sucursal_id || !req.body.nombre || !req.body.codigo)
      throw new AppError('sucursal_id, nombre y codigo son requeridos', 400);

    const tenantId = req.user!.tenantId;

    // Verificar límite total de puntos de venta (COALESCE: override tenant > límite del plan)
    const { rows: limitRows } = await pool.query(
      `SELECT COALESCE(t.max_puntos_venta, p.max_puntos_venta) AS lim
       FROM tenants t LEFT JOIN planes p ON p.id = t.plan_id
       WHERE t.id = $1`,
      [tenantId]
    );
    const limite = limitRows[0]?.lim as number | null;
    if (limite !== null && limite !== undefined) {
      const { rows: cnt } = await pool.query(
        `SELECT COUNT(*) AS c
         FROM puntos_venta pv
         JOIN sucursales s ON s.id = pv.sucursal_id
         WHERE s.tenant_id = $1`,
        [tenantId]
      );
      if (parseInt(cnt[0].c, 10) >= limite) {
        throw new AppError(
          `Has alcanzado el límite de ${limite} punto${limite !== 1 ? 's' : ''} de venta de tu plan. ` +
          `Para agregar más, comunícate con soporte.`,
          403
        );
      }
    }

    res.status(201).json(await svc.createPuntoVenta(req.body, tenantId));
  } catch (e) { next(e); }
}

export async function putPuntoVenta(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    res.json(await svc.updatePuntoVenta(id, req.body, req.user!.tenantId));
  } catch (e) { next(e); }
}

export async function removePuntoVenta(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const ok = await svc.deletePuntoVenta(id, req.user!.tenantId);
    if (!ok) throw new AppError('Punto de venta no encontrado', 404);
    res.status(204).send();
  } catch (e) { next(e); }
}

// ── API Hacienda — solo lectura (superadmin gestiona las credenciales) ────────

export async function getAPIMH(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getAPIMH(req.user!.tenantId)); } catch (e) { next(e); }
}

/** PUT /api/config/api-mh — Actualiza credenciales y configuración API Hacienda */
export async function putAPIMH(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.updateAPIMH(req.user!.tenantId, req.body);
    res.json(await svc.getAPIMH(req.user!.tenantId));
  } catch (e) { next(e); }
}

// ── Firma Electrónica — solo lectura (superadmin gestiona la firma) ───────────

// Directorio de certificados por tenant (ruta interna, nunca expuesta al frontend)
const certStorage = (tenantId: number) =>
  path.join(__dirname, '..', '..', '..', 'uploads', 'certs', `tenant-${tenantId}`);

const firmaStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = certStorage(req.user!.tenantId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `certificado${ext}`);
  },
});

export const uploadFirmaMiddleware = multer({
  storage: firmaStorage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    ['.p12', '.pfx'].includes(ext)
      ? cb(null, true)
      : cb(new AppError('Solo archivos .p12 o .pfx', 400));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('certificado');

export async function getFirma(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getFirma(req.user!.tenantId)); } catch (e) { next(e); }
}

/** PUT /api/config/firma — Actualiza contraseña, NIT y fecha de vencimiento */
export async function putFirma(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.updateFirma(req.user!.tenantId, req.body);
    res.json(await svc.getFirma(req.user!.tenantId));
  } catch (e) { next(e); }
}

/** POST /api/config/firma/certificado — Sube el archivo .p12/.pfx del cliente */
export async function postFirmaCertificado(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ningún archivo' });
      return;
    }
    await svc.uploadFirmaCertificado(
      req.user!.tenantId,
      req.file.originalname,
      req.file.path,
    );
    res.json(await svc.getFirma(req.user!.tenantId));
  } catch (e) { next(e); }
}
