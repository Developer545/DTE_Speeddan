/**
 * upload.middleware.ts — Configuración de multer para uploads del SuperAdmin.
 *
 * Exports:
 *   - uploadFirmaMiddleware    → acepta .p12/.pfx, guarda en /uploads/certs/tenant-{id}/
 *   - uploadTenantLogoMiddleware → acepta imágenes, guarda en /uploads/empresa/tenant-{id}/
 */

import path   from 'path';
import fs     from 'fs';
import multer from 'multer';

// ── Certificado de firma digital (.p12 / .pfx) ────────────────────────────────

const certStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = parseInt(req.params.id as string, 10);
    const dir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'certs', `tenant-${tenantId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `certificado${ext}`);
  },
});

/** Middleware multer para subir certificado .p12/.pfx por tenant. */
export const uploadFirmaMiddleware = multer({
  storage: certStorage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    ['.p12', '.pfx'].includes(ext)
      ? cb(null, true)
      : cb(new Error('Solo se permiten archivos .p12 o .pfx'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('certificado');

// ── Logo de empresa ───────────────────────────────────────────────────────────

const logoAdminStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = parseInt(req.params.id as string, 10);
    const dir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'empresa', `tenant-${tenantId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-tmp${ext}`);
  },
});

/** Middleware multer para subir el logo de empresa de un tenant. */
export const uploadTenantLogoMiddleware = multer({
  storage: logoAdminStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Solo JPG, PNG, SVG o WebP'));
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
}).single('logo');
