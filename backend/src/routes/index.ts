/**
 * routes/index.ts — Combina todos los routers de la API.
 * Para agregar un nuevo módulo: importar su router y montarlo aquí.
 */

import { Router, Request, Response } from 'express';
import { requireAuth }    from '../middleware/auth.middleware';
import { pool }           from '../config/database';
import authRoutes         from './auth.routes';
import clienteRoutes      from './cliente.routes';
import proveedorRoutes    from './proveedor.routes';
import categoriaRoutes    from './categoria.routes';
import empleadoRoutes     from './empleado.routes';
import productoRoutes     from './producto.routes';
import compraRoutes       from './compra.routes';
import inventarioRoutes   from './inventario.routes';
import facturacionRoutes  from './facturacion.routes';
import configRoutes       from './config.routes';
import catalogRoutes      from './catalog.routes';
import reportesRoutes     from './reportes.routes';
import dashboardRoutes       from './dashboard.routes';
import notificacionesRoutes  from './notificaciones.routes';

const router = Router();

// ── Rutas públicas (sin autenticación) ────────────────────────────────────────
router.use('/auth', authRoutes);

// ── Todas las demás rutas requieren JWT válido ────────────────────────────────
router.use(requireAuth);

/**
 * GET /api/tenant/status
 * Devuelve el estado actual del tenant del usuario autenticado.
 * El frontend lo usa para mostrar alertas de pago y modo solo lectura.
 */
router.get('/tenant/status', async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT estado, fecha_pago, fecha_suspension FROM tenants WHERE id = $1`,
    [req.user!.tenantId]
  );
  res.json(rows[0] ?? { estado: 'activo', fecha_pago: null, fecha_suspension: null });
});

router.use('/clientes',     clienteRoutes);
router.use('/proveedores',  proveedorRoutes);
router.use('/categorias',   categoriaRoutes);
router.use('/empleados',    empleadoRoutes);
router.use('/productos',    productoRoutes);
router.use('/compras',      compraRoutes);
router.use('/inventario',   inventarioRoutes);
router.use('/facturas',     facturacionRoutes);
router.use('/config',       configRoutes);
router.use('/catalogs',     catalogRoutes);
router.use('/reportes',     reportesRoutes);
router.use('/dashboard',       dashboardRoutes);
router.use('/notificaciones',  notificacionesRoutes);

/**
 * GET /api/onboarding/status
 * Devuelve el estado del checklist de onboarding para el tenant actual.
 * El frontend lo usa para mostrar la guía de configuración inicial.
 */
router.get('/onboarding/status', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  try {
    const [empresa, productos, sucursales, clientes, facturas] = await Promise.all([
      pool.query(`SELECT nit, ncr, nombre_negocio, direccion FROM configuracion_empresa WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::INT AS cnt FROM productos WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::INT AS cnt FROM sucursales WHERE tenant_id = $1 AND activo = true`, [tenantId]),
      pool.query(`SELECT COUNT(*)::INT AS cnt FROM clientes WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::INT AS cnt FROM facturas WHERE tenant_id = $1`, [tenantId]),
    ]);

    const e = empresa.rows[0];
    res.json({
      empresa_completa:  !!(e?.nit && e?.ncr && e?.nombre_negocio && e?.direccion),
      tiene_productos:   productos.rows[0].cnt > 0,
      tiene_sucursal:    sucursales.rows[0].cnt > 0,
      tiene_clientes:    clientes.rows[0].cnt > 0,
      primera_factura:   facturas.rows[0].cnt > 0,
    });
  } catch { res.json({ empresa_completa: false, tiene_productos: false, tiene_sucursal: false, tiene_clientes: false, primera_factura: false }); }
});

export default router;
