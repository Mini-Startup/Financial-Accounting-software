require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Brokerage Test Data...');

  // 1. Ensure Groups Exist
  const brokerGroup = await prisma.group.upsert({
    where: { fldGroupName: 'Broker' },
    update: {},
    create: { fldGroupName: 'Broker' },
  });

  const clientGroup = await prisma.group.upsert({
    where: { fldGroupName: 'Client' },
    update: {},
    create: { fldGroupName: 'Client' },
  });

  // 2. Create Exchanges
  const nse = await prisma.exchange.upsert({
    where: { code: 'NSE' },
    update: { isActive: true },
    create: { code: 'NSE', name: 'National Stock Exchange', isActive: true },
  });

  // 3. Create Brokers
  const zerodha = await prisma.account.create({
    data: { fldName: 'Zerodha', fldType: 'BROKER', fldGroupNo: brokerGroup.fldGroupNo },
  });
  const angelOne = await prisma.account.create({
    data: { fldName: 'AngelOne', fldType: 'BROKER', fldGroupNo: brokerGroup.fldGroupNo },
  });
  const icici = await prisma.account.create({
    data: { fldName: 'ICICI Direct', fldType: 'BROKER', fldGroupNo: brokerGroup.fldGroupNo },
  });

  // 4. Create Clients
  const rahul = await prisma.account.create({
    data: { fldName: 'Rahul Shah', fldType: 'CLIENT', fldGroupNo: clientGroup.fldGroupNo },
  });
  const mehta = await prisma.account.create({
    data: { fldName: 'Mehta Traders', fldType: 'CLIENT', fldGroupNo: clientGroup.fldGroupNo },
  });
  const alpha = await prisma.account.create({
    data: { fldName: 'Alpha Investments', fldType: 'CLIENT', fldGroupNo: clientGroup.fldGroupNo },
  });

  // 5. Create Scripts
  const reliance = await prisma.script.create({
    data: { fldScriptName: 'RELIANCE' },
  });
  const tcs = await prisma.script.create({
    data: { fldScriptName: 'TCS' },
  });

  // 6. Create Brokerage Rules
  
  // CLIENT: Rahul Shah - Default (Percentage)
  await prisma.brokerage.create({
    data: {
      accountId: rahul.id,
      exchangeId: nse.id,
      appliesTo: 'CLIENT',
      type: 'PERCENT',
      scope: 'DEFAULT',
      tradingBuyPct: 0.10,
      tradingSellPct: 0.10,
      tradingMinFee: 5,
      deliveryBuyPct: 0.15,
      deliverySellPct: 0.15,
      deliveryMinFee: 10,
    }
  });
  // CLIENT: Rahul Shah - Script Override (RELIANCE)
  await prisma.brokerage.create({
    data: {
      accountId: rahul.id,
      exchangeId: nse.id,
      appliesTo: 'CLIENT',
      type: 'PERCENT',
      scope: 'SCRIPT',
      scriptId: reliance.id,
      tradingBuyPct: 0.05,
      tradingSellPct: 0.05,
      tradingMinFee: 2,
    }
  });

  // CLIENT: Mehta Traders - Default (Amount)
  await prisma.brokerage.create({
    data: {
      accountId: mehta.id,
      exchangeId: nse.id,
      appliesTo: 'CLIENT',
      type: 'AMOUNT',
      scope: 'DEFAULT',
      baseAmount: 1000,
      flatFee: 20,
    }
  });

  // CLIENT: Alpha Investments - Default (Percentage)
  await prisma.brokerage.create({
    data: {
      accountId: alpha.id,
      exchangeId: nse.id,
      appliesTo: 'CLIENT',
      type: 'PERCENT',
      scope: 'DEFAULT',
      tradingBuyPct: 0.08,
      tradingSellPct: 0.08,
      tradingMinFee: 3,
    }
  });

  // BROKER: Zerodha - Default (Percentage)
  await prisma.brokerage.create({
    data: {
      accountId: zerodha.id,
      exchangeId: nse.id,
      appliesTo: 'BROKER',
      type: 'PERCENT',
      scope: 'DEFAULT',
      tradingBuyPct: 0.03,
      tradingSellPct: 0.03,
      tradingMinFee: 1,
    }
  });

  // BROKER: AngelOne - Default (Amount)
  await prisma.brokerage.create({
    data: {
      accountId: angelOne.id,
      exchangeId: nse.id,
      appliesTo: 'BROKER',
      type: 'AMOUNT',
      scope: 'DEFAULT',
      baseAmount: 1000,
      flatFee: 10,
    }
  });

  // BROKER: ICICI Direct - Default (Percentage)
  await prisma.brokerage.create({
    data: {
      accountId: icici.id,
      exchangeId: nse.id,
      appliesTo: 'BROKER',
      type: 'PERCENT',
      scope: 'DEFAULT',
      tradingBuyPct: 0.05,
      tradingSellPct: 0.05,
      tradingMinFee: 2,
    }
  });

  console.log('✅ Brokerage test data seeded successfully!');
  console.log(`  Exchange: NSE (${nse.id})`);
  console.log(`  Brokers: Zerodha, AngelOne, ICICI Direct`);
  console.log(`  Clients: Rahul Shah, Mehta Traders, Alpha Investments`);
  console.log(`  Scripts: RELIANCE, TCS`);
  console.log(`  Brokerage rules: 7 total`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
