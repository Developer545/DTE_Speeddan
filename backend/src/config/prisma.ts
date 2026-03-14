/**
 * prisma.ts — Singleton del cliente Prisma (Prisma 7)
 *
 * Prisma 7 requiere pasar un 'driver adapter' explicito al constructor.
 * Usamos @prisma/adapter-pg. El cast 'as any' evita conflicto entre
 * versiones internas de @types/pg (la nuestra vs la de adapter-pg).
 *
 * Uso:
 *   import { prisma } from './config/prisma'
 *   const clientes = await prisma.cliente.findMany({ where: { tenantId: 1 } })
 */

import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg }     from '@prisma/adapter-pg'

// Singleton global (evita duplicados en dev con hot-reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
  } as any)
  return new PrismaClient({ adapter })
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
