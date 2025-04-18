import { PrismaClient } from '../generated/prisma'

const globalPromise = global as unknown as {
  prisma: PrismaClient
}

export const db = globalPromise.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalPromise.prisma = db
