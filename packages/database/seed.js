require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Normalize DB column names (remove legacy fld* names) and ensure new columns exist.
  // We keep migrations minimal, so db-init enforces schema compatibility.
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      -- groups: fldGroupNo/fldGroupName -> id/name
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'fldGroupNo'
      ) THEN
        ALTER TABLE "groups" RENAME COLUMN "fldGroupNo" TO "id";
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'fldGroupName'
      ) THEN
        ALTER TABLE "groups" RENAME COLUMN "fldGroupName" TO "name";
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      -- accounts: drop old FK before renaming group column
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'accounts'
          AND constraint_name = 'accounts_fldGroupNo_fkey'
      ) THEN
        ALTER TABLE "accounts" DROP CONSTRAINT "accounts_fldGroupNo_fkey";
      END IF;

      -- rename legacy columns to simple names
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldClient') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldClient" TO "code";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldName') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldName" TO "name";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldGroupNo') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldGroupNo" TO "group_id";
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldOpening') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldOpening" TO "opening";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldDebit') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldDebit" TO "debit";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldCredit') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldCredit" TO "credit";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldClosing') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldClosing" TO "closing";
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldAddress') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldAddress" TO "address";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldMobile') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldMobile" TO "mobile_number";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldPhoneO1') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldPhoneO1" TO "office_number";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='fldEmail') THEN
        ALTER TABLE "accounts" RENAME COLUMN "fldEmail" TO "email";
      END IF;

      -- re-add FK with new column name (if present)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='group_id')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='groups' AND column_name='id') THEN
        ALTER TABLE "accounts"
          ADD CONSTRAINT "accounts_group_id_fkey"
          FOREIGN KEY ("group_id") REFERENCES "groups"("id")
          ON UPDATE CASCADE ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // Ensure new columns exist on accounts (safe for old/new DBs)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "accounts"
      ADD COLUMN IF NOT EXISTS "whatsapp_number" TEXT,
      ADD COLUMN IF NOT EXISTS "contact_person_name" TEXT,
      ADD COLUMN IF NOT EXISTS "contact_person_mobile" TEXT,
      ADD COLUMN IF NOT EXISTS "contact_person_email" TEXT,
      ADD COLUMN IF NOT EXISTS "default_credit" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "interest" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "bank_name" TEXT,
      ADD COLUMN IF NOT EXISTS "bank_branch" TEXT,
      ADD COLUMN IF NOT EXISTS "ifsc_code" TEXT,
      ADD COLUMN IF NOT EXISTS "bank_account_number" TEXT,
      ADD COLUMN IF NOT EXISTS "upi_id" TEXT,
      ADD COLUMN IF NOT EXISTS "reference_mobile" TEXT,
      ADD COLUMN IF NOT EXISTS "reference_email" TEXT;
  `);

  console.log('DB INIT: clearing data (keeping Groups, Roles, Exchanges)...');

  // IMPORTANT: keep groups, roles, exchanges. Everything else is wiped.
  // Order matters due to FKs.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "brokerages" RESTART IDENTITY CASCADE;`);
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

  console.log('✅ DB INIT done: Groups + Roles + Exchanges are ready');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });