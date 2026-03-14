/**
 * schemas.ts — Schemas Zod para validación de inputs en el backend.
 *
 * Centralizar aquí todos los schemas garantiza consistencia y
 * hace fácil encontrar qué se acepta en cada endpoint.
 */

import { z } from 'zod';

// ── Helpers reutilizables ─────────────────────────────────────────────────────

/** String vacío → undefined (para campos opcionales que llegan como '') */
const optionalStr = z.string().trim().optional().transform(v => v === '' ? undefined : v);

/** Fecha ISO o YYYY-MM-DD, vacío → undefined */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform(v => (v === '' ? undefined : v))
  .refine(v => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: 'Formato de fecha inválido. Use YYYY-MM-DD',
  });

// ═══════════════════════════════════════════════════════════════════════════════
// ── SUPERADMIN AUTH ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const SuperAdminLoginSchema = z.object({
  username: z.string().trim().min(1, 'El username es requerido'),
  password: z.string().min(1, 'El password es requerido'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── TENANT AUTH ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const TenantLoginSchema = z.object({
  tenant_slug: z.string().trim().min(1, 'El código de empresa es requerido'),
  username:    z.string().trim().min(1, 'El username es requerido'),
  password:    z.string().min(1, 'El password es requerido'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── TENANTS ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateTenantSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  slug: z
    .string()
    .trim()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'El código solo puede contener letras minúsculas, números y guiones'),

  email_contacto:  optionalStr.pipe(z.string().email('Email inválido').optional()),
  telefono:        optionalStr,
  plan_id:         z.number().int().positive().optional().nullable(),
  fecha_pago:      optionalDate,
  notas:           optionalStr,

  // Credenciales del admin inicial
  admin_username: z.string().trim().min(3, 'El username del admin debe tener al menos 3 caracteres').max(50).optional(),
  admin_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  admin_nombre:   optionalStr,
});

export const UpdateTenantSchema = z.object({
  nombre:           z.string().trim().min(2).max(200).optional(),
  slug:             z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  email_contacto:   optionalStr.pipe(z.string().email('Email inválido').optional()),
  telefono:         optionalStr,
  plan_id:          z.number().int().positive().optional().nullable(),
  estado:           z.enum(['pruebas', 'activo', 'suspendido']).optional(),
  fecha_pago:       optionalDate,
  fecha_suspension: optionalDate,
  notas:            optionalStr,
  max_sucursales:    z.number().int().min(1).optional().nullable(),
  max_puntos_venta:  z.number().int().min(1).optional().nullable(),
  max_usuarios:      z.number().int().min(1).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── PAGOS ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const RegistrarPagoSchema = z.object({
  monto:                    z.number().positive('El monto debe ser mayor a 0'),
  fecha_pago:               optionalDate,
  metodo:                   optionalStr,
  notas:                    optionalStr,
  nueva_fecha_vencimiento:  optionalDate,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── USUARIOS DE TENANT ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateUsuarioTenantSchema = z.object({
  nombre:   z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  username: z.string().trim().min(3, 'El username debe tener al menos 3 caracteres').max(50)
              .regex(/^[a-zA-Z0-9_.-]+$/, 'Username solo puede contener letras, números, puntos, guiones y guión bajo'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol:      z.enum(['admin', 'usuario']).optional().default('usuario'),
});

export const UpdateUsuarioTenantSchema = z.object({
  nombre:   z.string().trim().min(2).max(100).optional(),
  username: z.string().trim().min(3).max(50).optional(),
  password: z.string().min(6).optional().transform(v => v === '' ? undefined : v),
  rol:      z.enum(['admin', 'usuario']).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── PLANES ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const CreatePlanSchema = z.object({
  nombre:         z.string().trim().min(2).max(100),
  max_sucursales: z.number().int().min(1),
  max_usuarios:   z.number().int().min(1),
  precio:         z.number().min(0),
  activo:         z.boolean().optional().default(true),
});
