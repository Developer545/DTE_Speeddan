/**
 * validate.ts — Middleware de validación de body para Express.
 *
 * Exporta dos helpers:
 *   validateBody  — reglas simples (campo requerido, valores permitidos)
 *   validateZod   — schema Zod completo con mensajes detallados
 *
 * Uso validateZod:
 *   router.post('/tenants', validateZod(CreateTenantSchema), ctrl.postTenant)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema }                        from 'zod';
import { AppError }                        from './errorHandler';

// ── Validación con schema Zod ─────────────────────────────────────────────────

export function validateZod(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errores = result.error.issues.map(e => ({
        campo:   e.path.map(String).join('.') || 'body',
        mensaje: e.message,
      }));
      res.status(422).json({ message: 'Datos inválidos', errores });
      return;
    }

    // Sobreescribe req.body con los datos limpios y transformados por Zod
    req.body = result.data;
    next();
  };
}

interface ValidationRule {
  field:          string;
  required?:      boolean;
  allowedValues?: string[];
}

/** Retorna un middleware Express que valida req.body según las reglas dadas. */
export function validateBody(rules: ValidationRule[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        next(new AppError(`El campo '${rule.field}' es requerido`, 400));
        return;
      }

      if (value && rule.allowedValues && !rule.allowedValues.includes(String(value))) {
        next(new AppError(
          `El campo '${rule.field}' debe ser uno de: ${rule.allowedValues.join(', ')}`,
          400
        ));
        return;
      }
    }
    next();
  };
}
