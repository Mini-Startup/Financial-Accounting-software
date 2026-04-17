import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

// Initialize Postgres connection pool
const pool = new Pool({ connectionString });

// Use the Prisma pg adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma client with the explicit adapter
export const prisma = new PrismaClient({ adapter });
export * from '@prisma/client';
