require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
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
      where: { fldGroupName: name },
      update: {},
      create: { fldGroupName: name },
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

  console.log("✅ Seed done — Groups & Roles created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());