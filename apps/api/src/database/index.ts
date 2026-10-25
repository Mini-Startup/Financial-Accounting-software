import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Initialize or reuse Postgres connection pool with production-grade tuning
export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: process.env.PG_MAX_POOL ? parseInt(process.env.PG_MAX_POOL, 10) : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

// Use the Prisma pg adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma client with explicit adapter and reuse across hot-reloads
export const prisma =
  globalForDb.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.prisma = prisma;
  globalForDb.pool = pool;
}

export * from '@prisma/client';
