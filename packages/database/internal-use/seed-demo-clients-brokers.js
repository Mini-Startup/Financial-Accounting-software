require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function upsertAccountByCode(data) {
  const existing = await prisma.account.findFirst({
    where: { code: data.code },
  });

  if (existing) {
    return prisma.account.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.account.create({ data });
}

async function findOrCreateScript(scriptName, shortName) {
  const existing = await prisma.script.findFirst({
    where: { fullName: scriptName },
  });
  if (existing) return existing;

  return prisma.script.create({
    data: {
      fullName: scriptName,
      shortName: shortName,
      lotSize: 1,
    },
  });
}

async function upsertRule(data) {
  const existing = await prisma.brokerage.findFirst({
    where: {
      accountId: data.accountId,
      exchangeId: data.exchangeId,
      appliesTo: data.appliesTo,
      scope: data.scope,
      scriptId: data.scriptId ?? null,
    },
  });

  if (existing) {
    return prisma.brokerage.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.brokerage.create({ data });
}

async function main() {
  console.log('Seeding demo clients/brokers and brokerage rules...');

  const debtorsGroup = await prisma.group.findUnique({
    where: { name: 'Sundry Debtors' },
  });
  const creditorsGroup = await prisma.group.findUnique({
    where: { name: 'Sundry Creditors' },
  });

  if (!debtorsGroup || !creditorsGroup) {
    throw new Error('Required groups not found. Run "pnpm db-init" first.');
  }

  const nse = await prisma.exchange.upsert({
    where: { code: 'NSE' },
    update: { isActive: true, name: 'National Stock Exchange' },
    create: { code: 'NSE', name: 'National Stock Exchange', isActive: true },
  });

  const bse = await prisma.exchange.upsert({
    where: { code: 'BSE' },
    update: { isActive: true, name: 'Bombay Stock Exchange' },
    create: { code: 'BSE', name: 'Bombay Stock Exchange', isActive: true },
  });

  const reliance = await findOrCreateScript('RELIANCE', 'RELI');
  const tcs = await findOrCreateScript('TCS', 'TCS');

  const clients = await Promise.all([
    upsertAccountByCode({
      code: 'C001',
      name: 'Aarav Investments',
      groupId: debtorsGroup.id,
      mobileNumber: '9876500001',
      email: 'aarav.investments@example.com',
      address: 'Surat',
      whatsappNumber: '9876500001',
    }),
    upsertAccountByCode({
      code: 'C002',
      name: 'Mehta Wealth',
      groupId: debtorsGroup.id,
      mobileNumber: '9876500002',
      email: 'mehta.wealth@example.com',
      address: 'Ahmedabad',
      whatsappNumber: '9876500002',
    }),
    upsertAccountByCode({
      code: 'C003',
      name: 'Shah Capitals',
      groupId: debtorsGroup.id,
      mobileNumber: '9876500003',
      email: 'shah.capitals@example.com',
      address: 'Mumbai',
      whatsappNumber: '9876500003',
    }),
    upsertAccountByCode({
      code: 'C004',
      name: 'Patel Traders',
      groupId: debtorsGroup.id,
      mobileNumber: '9876500004',
      email: 'patel.traders@example.com',
      address: 'Rajkot',
      whatsappNumber: '9876500004',
    }),
  ]);

  const brokers = await Promise.all([
    upsertAccountByCode({
      code: 'B001',
      name: 'Zerodha Partner Desk',
      groupId: creditorsGroup.id,
      mobileNumber: '9987600001',
      email: 'zerodha.partner@example.com',
      address: 'Mumbai',
      whatsappNumber: '9987600001',
    }),
    upsertAccountByCode({
      code: 'B002',
      name: 'Angel Market Services',
      groupId: creditorsGroup.id,
      mobileNumber: '9987600002',
      email: 'angel.market@example.com',
      address: 'Mumbai',
      whatsappNumber: '9987600002',
    }),
    upsertAccountByCode({
      code: 'B003',
      name: 'ICICI Direct Channel',
      groupId: creditorsGroup.id,
      mobileNumber: '9987600003',
      email: 'icici.channel@example.com',
      address: 'Pune',
      whatsappNumber: '9987600003',
    }),
    upsertAccountByCode({
      code: 'B004',
      name: 'HDFC Trade Hub',
      groupId: creditorsGroup.id,
      mobileNumber: '9987600004',
      email: 'hdfc.trade@example.com',
      address: 'Ahmedabad',
      whatsappNumber: '9987600004',
    }),
  ]);

  // Client rules
  await upsertRule({
    accountId: clients[0].id,
    exchangeId: nse.id,
    appliesTo: 'CLIENT',
    type: 'PERCENT',
    scope: 'DEFAULT',
    tradingBuyPct: 0.12,
    tradingSellPct: 0.12,
    tradingMinFee: 5,
    deliveryBuyPct: 0.15,
    deliverySellPct: 0.15,
    deliveryMinFee: 8,
  });
  await upsertRule({
    accountId: clients[1].id,
    exchangeId: nse.id,
    appliesTo: 'CLIENT',
    type: 'PERCENT',
    scope: 'DEFAULT',
    tradingBuyPct: 0.10,
    tradingSellPct: 0.10,
    tradingMinFee: 4,
    deliveryBuyPct: 0.13,
    deliverySellPct: 0.13,
    deliveryMinFee: 7,
  });
  await upsertRule({
    accountId: clients[2].id,
    exchangeId: bse.id,
    appliesTo: 'CLIENT',
    type: 'AMOUNT',
    scope: 'DEFAULT',
    baseAmount: 1000,
    flatFee: 20,
  });
  await upsertRule({
    accountId: clients[3].id,
    exchangeId: nse.id,
    appliesTo: 'CLIENT',
    type: 'PERCENT',
    scope: 'DEFAULT',
    tradingBuyPct: 0.08,
    tradingSellPct: 0.08,
    tradingMinFee: 3,
    deliveryBuyPct: 0.10,
    deliverySellPct: 0.10,
    deliveryMinFee: 5,
  });

  // Broker rules
  await upsertRule({
    accountId: brokers[0].id,
    exchangeId: nse.id,
    appliesTo: 'BROKER',
    type: 'PERCENT',
    scope: 'DEFAULT',
    tradingBuyPct: 0.03,
    tradingSellPct: 0.03,
    tradingMinFee: 1,
    deliveryBuyPct: 0.05,
    deliverySellPct: 0.05,
    deliveryMinFee: 2,
  });
  await upsertRule({
    accountId: brokers[1].id,
    exchangeId: nse.id,
    appliesTo: 'BROKER',
    type: 'AMOUNT',
    scope: 'DEFAULT',
    baseAmount: 1000,
    flatFee: 10,
  });
  await upsertRule({
    accountId: brokers[2].id,
    exchangeId: bse.id,
    appliesTo: 'BROKER',
    type: 'PERCENT',
    scope: 'DEFAULT',
    tradingBuyPct: 0.04,
    tradingSellPct: 0.04,
    tradingMinFee: 1.5,
    deliveryBuyPct: 0.06,
    deliverySellPct: 0.06,
    deliveryMinFee: 2.5,
  });
  await upsertRule({
    accountId: brokers[3].id,
    exchangeId: nse.id,
    appliesTo: 'BROKER',
    type: 'PERCENT',
    scope: 'DEFAULT',
    tradingBuyPct: 0.035,
    tradingSellPct: 0.035,
    tradingMinFee: 1.2,
    deliveryBuyPct: 0.055,
    deliverySellPct: 0.055,
    deliveryMinFee: 2.2,
  });

  // Script-specific overrides
  await upsertRule({
    accountId: clients[0].id,
    exchangeId: nse.id,
    appliesTo: 'CLIENT',
    type: 'PERCENT',
    scope: 'SCRIPT',
    scriptId: reliance.id,
    tradingBuyPct: 0.06,
    tradingSellPct: 0.06,
    tradingMinFee: 2,
  });
  await upsertRule({
    accountId: brokers[0].id,
    exchangeId: nse.id,
    appliesTo: 'BROKER',
    type: 'PERCENT',
    scope: 'SCRIPT',
    scriptId: tcs.id,
    tradingBuyPct: 0.02,
    tradingSellPct: 0.02,
    tradingMinFee: 0.8,
  });

  console.log('✅ Demo seed complete');
  console.log(`Clients: ${clients.length}, Brokers: ${brokers.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

