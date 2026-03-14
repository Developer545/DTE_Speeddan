/**
 * prisma.ts — Singleton del cliente Prisma (Prisma 7)
 *
 * Exporta una unica instancia de PrismaClient para toda la app.
 * Evita crear multiples conexiones en desarrollo (hot-reload).
 *
 * Uso:
 *   import { prisma } from './config/prisma'
 *   const clientes = await prisma.cliente.findMany({ where: { tenantId: 1 } })
 */

import { PrismaClient } from '../generated/prisma'

// Singleton global (evita duplicados en dev con hot-reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
