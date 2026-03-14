/**
 * producto.controller.ts — Handlers HTTP para /api/productos.
 * Maneja multipart/form-data (imagen via multer) + JSON.
 *
 * Nomenclatura de archivos de imagen:
 *   - Las imágenes se nombran con el ID del producto: {id}.{ext}
 *     Ej: 1.jpg, 42.png, 7.svg
 *   - En CREATE: multer guarda un archivo temporal, luego se renombra
 *     una vez que el INSERT devuelve el id generado.
 *   - En UPDATE: se renombra directamente con el id conocido del parámetro.
 */

import path from 'path';
import fs   from 'fs';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as productoService from '../services/producto.service';
import { AppError } from '../middleware/errorHandler';

// ── Configuración de multer ────────────────────────────────────────────────────

/** Ruta absoluta a la carpeta de imágenes de productos (raíz del proyecto). */
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'productos');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Crear la carpeta si no existe
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // Nombre temporal hasta obtener el ID del producto
    const ext  = path.extname(file.originalname).toLowerCase();
    const temp = `tmp-${Date.now()}${ext}`;
    cb(null, temp);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
  const ext     = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Solo se permiten imágenes JPG, PNG, SVG o WebP', 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máx
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Renombra el archivo temporal al nombre definitivo `{id}{ext}`.
 * Si ya existe un archivo con ese id pero distinta extensión, lo elimina primero.
 * Retorna la URL pública del archivo renombrado.
 */
function renameToId(tempFilename: string, id: number): string {
  const ext         = path.extname(tempFilename).toLowerCase();
  const finalName   = `${id}${ext}`;
  const tempPath    = path.join(UPLOADS_DIR, tempFilename);
  const finalPath   = path.join(UPLOADS_DIR, finalName);

  // Borrar cualquier imagen previa con este id (diferente extensión)
  deleteImageById(id, ext);

  fs.renameSync(tempPath, finalPath);
  return `/uploads/productos/${finalName}`;
}

/** Elimina el archivo físico cuyo nombre base es el ID, ignorando la extensión del nuevo. */
function deleteImageById(id: number, skipExt?: string): void {
  const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
  allowed.forEach(ext => {
    if (skipExt && ext === skipExt) return;
    const filepath = path.join(UPLOADS_DIR, `${id}${ext}`);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  });
}

/** Elimina el archivo físico a partir de su URL pública. */
function deleteImageByUrl(imagenUrl: string | null | undefined): void {
  if (!imagenUrl) return;
  const filepath = path.join(UPLOADS_DIR, path.basename(imagenUrl));
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/** GET /api/productos?search=&page=1&limit=10&categoria_id=5 */
export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const page        = parseInt(req.query.page  as string || '1',  10);
    const limit       = parseInt(req.query.limit as string || '10', 10);
    const search      = (req.query.search as string) || '';
    const categoria_id = req.query.categoria_id
      ? parseInt(req.query.categoria_id as string, 10)
      : undefined;

    const result = await productoService.getProductos({ search, page, limit, categoria_id }, req.user!.tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * POST /api/productos  (multipart/form-data)
 * Flujo con imagen:
 *   1. multer guarda archivo temporal (tmp-{timestamp}.ext)
 *   2. INSERT del producto → obtenemos el id
 *   3. Renombrar archivo a {id}.ext
 *   4. UPDATE imagen_url con la URL definitiva
 */
export async function create(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  const tempFile = req.file; // guardado por multer antes de entrar aquí

  try {
    const dto = {
      nombre:       req.body.nombre,
      categoria_id: req.body.categoria_id ? parseInt(req.body.categoria_id, 10) : null,
    };

    const tenantId = req.user!.tenantId;
    // Crear producto primero (sin imagen) para obtener el id
    const producto = await productoService.createProducto(dto, null, tenantId);

    if (tempFile) {
      // Renombrar a {id}.ext y actualizar DB
      const finalUrl = renameToId(tempFile.filename, producto.id);
      const final    = await productoService.updateProducto(producto.id, {}, tenantId, finalUrl);
      res.status(201).json(final);
    } else {
      res.status(201).json(producto);
    }
  } catch (err) {
    // Limpiar archivo temporal si algo falló
    if (tempFile) {
      const tempPath = path.join(UPLOADS_DIR, tempFile.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
    next(err);
  }
}

/**
 * PUT /api/productos/:id  (multipart/form-data)
 * Si viene nueva imagen: renombrar a {id}.ext (borrando la anterior automáticamente).
 */
export async function update(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  const tempFile = req.file;

  try {
    const id       = parseInt(req.params.id as string, 10);
    const tenantId = req.user!.tenantId;
    const existing = await productoService.getProductoById(id, tenantId);
    if (!existing) {
      if (tempFile) deleteImageByUrl(`/uploads/productos/${tempFile.filename}`);
      return next(new AppError('Producto no encontrado', 404));
    }

    let imagenUrl: string | null | undefined = undefined; // undefined = no tocar imagen
    if (tempFile) {
      // renameToId ya borra cualquier versión previa con distinto ext
      imagenUrl = renameToId(tempFile.filename, id);
    }

    const dto: { nombre?: string; categoria_id?: number | null } = {};
    if (req.body.nombre       !== undefined) dto.nombre       = req.body.nombre;
    if (req.body.categoria_id !== undefined)
      dto.categoria_id = req.body.categoria_id === '' ? null : parseInt(req.body.categoria_id, 10);

    const updated = await productoService.updateProducto(id, dto, tenantId, imagenUrl);
    if (!updated) return next(new AppError('Producto no encontrado', 404));
    res.json(updated);
  } catch (err) {
    if (tempFile) {
      const tempPath = path.join(UPLOADS_DIR, tempFile.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
    next(err);
  }
}

/** DELETE /api/productos/:id */
export async function remove(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const id       = parseInt(req.params.id as string, 10);
    const tenantId = req.user!.tenantId;
    const existing = await productoService.getProductoById(id, tenantId);

    const deleted = await productoService.deleteProducto(id, tenantId);
    if (!deleted) return next(new AppError('Producto no encontrado', 404));

    // Borrar imagen física (puede ser {id}.ext o URL guardada en DB)
    if (existing?.imagen_url) {
      deleteImageByUrl(existing.imagen_url);
    } else {
      // Por si acaso, intentar borrar por ID con cualquier extensión
      deleteImageById(id);
    }

    res.status(204).send();
  } catch (err) { next(err); }
}
