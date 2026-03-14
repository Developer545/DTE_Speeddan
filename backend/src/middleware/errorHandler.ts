/**
 * errorHandler.ts — Manejo centralizado de errores de Express.
 * Todos los errores no capturados llegan aquí, garantizando
 * respuestas JSON consistentes en toda la API.
 */

import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

/** Error personalizado con código HTTP. Lanzar en services/controllers. */
export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Middleware de error global — registrar DESPUÉS de todas las rutas. */
export function errorHandler(
  err:  Error,
  req:  Request,
  res:  Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error('[Error]', err.message);

  // Si el request tiene tenantId, adjuntarlo al scope de Sentry para contexto
  if ((req as any).tenantId) {
    Sentry.setTag('tenant_id', String((req as any).tenantId));
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error:      err.name,
      message:    err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  res.status(500).json({
    error:      'InternalServerError',
    message:    'Ocurrió un error inesperado',
    statusCode: 500,
  });
}
