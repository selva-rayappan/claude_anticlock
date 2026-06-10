import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDbUrl(): string {
  const raw = process.env.DATABASE_URL
  if (raw && raw !== 'undefined') return raw
  // fallback: absolute file URL to dev.db in project root
  const abs = path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/')
  return `file:${abs}`
}

function createPrismaClient() {
  const url = getDbUrl()
  const adapter = new PrismaLibSql({ url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
