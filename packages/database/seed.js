require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('DB INIT: clearing data (keeping Groups, Roles, Exchanges)...');

  // Wiping transaction and child tables first due to FKs
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "brokerages" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "trades" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "script_exchange_mappings" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "scripts" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "accounts" RESTART IDENTITY CASCADE;`);

  const groups = [
    "Unknown",
    "Capital Account",
    "Reserves & Surplus",
    "FD-OD & CC Account",
    "Secured Loans",
    "Unsecured Loans",
    "Current Liabilities",
    "Provisions",
    "Duties & Taxes",
    "Sundry Creditors",
    "Profit & Loss A/c.",
    "Fixed Assets",
    "Bank Accounts",
    "Cash Accounts",
    "Current Assets",
    "Sundry Debtors",
    "Income Accounts",
    "Expense Accounts",
    "Investments",
    "Deposits (Assets)",
    "Deposits (Liabilities)",
    "Preliminary Expenses",
    "Pre-Operative Expenses",
    "Margin Collected",
  ];

  for (const name of groups) {
    await prisma.group.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Seed default roles
  const roles = ["admin", "user"];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Seed Exchanges
  await prisma.exchange.upsert({
    where: { code: 'NSE' },
    update: { isActive: true, name: 'National Stock Exchange' },
    create: { code: 'NSE', name: 'National Stock Exchange', isActive: true },
  });

  await prisma.exchange.upsert({
    where: { code: 'BSE' },
    update: { isActive: true, name: 'Bombay Stock Exchange' },
    create: { code: 'BSE', name: 'Bombay Stock Exchange', isActive: true },
  });

  await prisma.exchange.upsert({
    where: { code: 'MCX' },
    update: { isActive: true, name: 'Multi Commodity Exchange' },
    create: { code: 'MCX', name: 'Multi Commodity Exchange', isActive: true },
  });

  await prisma.exchange.upsert({
    where: { code: 'NCDEX' },
    update: { isActive: true, name: 'National Commodity & Derivatives Exchange' },
    create: { code: 'NCDEX', name: 'National Commodity & Derivatives Exchange', isActive: true },
  });

  console.log('✅ DB INIT done: Groups + Roles + Exchanges are ready');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });