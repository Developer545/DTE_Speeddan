/**
 * env.ts — Validación y exportación de variables de entorno.
 * Importar ANTES que cualquier otro módulo en server.ts.
 * Lanza un error claro si falta una variable requerida.
 */

interface EnvConfig {
  PORT:                  number;
  DB_HOST:               string;
  DB_PORT:               number;
  DB_USER:               string;
  DB_PASSWORD:           string;
  DB_NAME:               string;
  NODE_ENV:              string;
  JWT_SECRET:            string;
  /** Secreto independiente para tokens de superadmin — separado del ERP normal */
  SUPERADMIN_JWT_SECRET: string;
  /** Clave opcional para autenticar llamadas server-to-server al superadmin */
  SUPERADMIN_API_KEY?:   string;
  /** Clave AES-256 (32 chars) para cifrar passwords de firma y API MH */
  ENCRYPTION_KEY:        string;
  /** Días de gracia después del vencimiento antes de suspender automáticamente */
  GRACE_PERIOD_DAYS:     number;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env: EnvConfig = {
  PORT:                  parseInt(process.env.PORT || '3001', 10),
  DB_HOST:               requireEnv('DB_HOST'),
  DB_PORT:               parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER:               requireEnv('DB_USER'),
  DB_PASSWORD:           requireEnv('DB_PASSWORD'),
  DB_NAME:               requireEnv('DB_NAME'),
  NODE_ENV:              process.env.NODE_ENV || 'development',
  JWT_SECRET:            requireEnv('JWT_SECRET'),
  SUPERADMIN_JWT_SECRET: requireEnv('SUPERADMIN_JWT_SECRET'),
  SUPERADMIN_API_KEY:    process.env.SUPERADMIN_API_KEY || undefined,
  ENCRYPTION_KEY:        requireEnv('ENCRYPTION_KEY'),
  GRACE_PERIOD_DAYS:     parseInt(process.env.GRACE_PERIOD_DAYS || '3', 10),
};
