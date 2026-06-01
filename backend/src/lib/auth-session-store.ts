import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

let ensureAuthSessionTablePromise: Promise<void> | null = null;

const createAuthSessionTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthSession" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "refreshTokenHash" TEXT NOT NULL,
      "userAgent" TEXT,
      "ipAddress" TEXT,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "revokedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession"("userId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AuthSession_revokedAt_idx" ON "AuthSession"("revokedAt");');
};

export const ensureAuthSessionTable = async (): Promise<void> => {
  ensureAuthSessionTablePromise ??= createAuthSessionTable().finally(() => {
    ensureAuthSessionTablePromise = null;
  });

  await ensureAuthSessionTablePromise;
};

export const isMissingAuthSessionTableError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022') &&
  String(error.meta?.modelName ?? error.meta?.table ?? error.message).includes('AuthSession');
