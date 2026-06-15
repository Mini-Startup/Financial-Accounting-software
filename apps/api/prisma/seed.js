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
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "trades" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "closing_rates" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "expiry_dates" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "brokerages" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "script_exchange_mappings" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "scripts" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "accounts" RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`);

  // 1. Seed standard groups
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
    "Sundry Creditors", // For Brokers
    "Profit & Loss A/c.",
    "Fixed Assets",
    "Bank Accounts",
    "Cash Accounts",
    "Current Assets",
    "Sundry Debtors", // For Clients
    "Income Accounts",
    "Expense Accounts",
    "Investments",
    "Deposits (Assets)",
    "Deposits (Liabilities)",
    "Preliminary Expenses",
    "Pre-Operative Expenses",
    "Margin Collected",
  ];

  const groupMap = {};
  for (const name of groups) {
    const g = await prisma.group.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    groupMap[name] = g.id;
  }

  // 2. Seed default roles
  const roles = ["admin", "user"];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. Seed Exchanges
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

  console.log('✅ Base tables upserted');

  // 4. Seed Accounts (Clients and Brokers)
  console.log('Seed Accounts...');
  const cli1 = await prisma.account.create({
    data: {
      code: 'CLI001',
      name: 'Alice Smith',
      groupId: groupMap['Sundry Debtors'],
      email: 'alice@example.com',
      mobileNumber: '9876543210',
    }
  });

  const cli2 = await prisma.account.create({
    data: {
      code: 'CLI002',
      name: 'Bob Johnson',
      groupId: groupMap['Sundry Debtors'],
      email: 'bob@example.com',
      mobileNumber: '9876543211',
    }
  });

  const cli3 = await prisma.account.create({
    data: {
      code: 'CLI003',
      name: 'Charlie Brown',
      groupId: groupMap['Sundry Debtors'],
      email: 'charlie@example.com',
      mobileNumber: '9876543212',
    }
  });

  const bro1 = await prisma.account.create({
    data: {
      code: 'BRO001',
      name: 'Zerodha',
      groupId: groupMap['Sundry Creditors'],
      email: 'support@zerodha.com',
      mobileNumber: '1800200030',
    }
  });

  const bro2 = await prisma.account.create({
    data: {
      code: 'BRO002',
      name: 'Angel One',
      groupId: groupMap['Sundry Creditors'],
      email: 'support@angelone.com',
      mobileNumber: '1800200040',
    }
  });

  // 5. Seed Scripts and Exchange Mappings
  console.log('Seed Scripts...');
  const scripts = [
    { shortName: 'TCS', fullName: 'Tata Consultancy Services', lotSize: 1 },
    { shortName: 'RELIANCE', fullName: 'Reliance Industries Ltd', lotSize: 1 },
    { shortName: 'INFOSYS', fullName: 'Infosys Limited', lotSize: 1 },
    { shortName: 'HDFCBANK', fullName: 'HDFC Bank Limited', lotSize: 1 },
    { shortName: 'TATAMOTORS', fullName: 'Tata Motors Limited', lotSize: 1 },
  ];

  const scriptMap = {};
  for (const s of scripts) {
    const createdScript = await prisma.script.create({
      data: {
        shortName: s.shortName,
        fullName: s.fullName,
        lotSize: s.lotSize,
        isActive: true,
      }
    });
    scriptMap[s.shortName] = createdScript.id;

    // Map to NSE and BSE
    await prisma.scriptExchangeMapping.create({
      data: {
        scriptId: createdScript.id,
        exchangeId: nse.id,
        exchangeScriptCode: s.shortName,
      }
    });

    await prisma.scriptExchangeMapping.create({
      data: {
        scriptId: createdScript.id,
        exchangeId: bse.id,
        exchangeScriptCode: s.shortName + '_BSE',
      }
    });
  }

  // 6. Seed Expiry Dates
  console.log('Seed Expiry Dates...');
  const expiries = ['2026-06-25', '2026-07-30', '2026-08-27'];
  for (const dateStr of expiries) {
    await prisma.expiryDate.create({
      data: {
        date: new Date(dateStr),
        isActive: true,
      }
    });
  }

  // 7. Seed Brokerages (Rules)
  console.log('Seed Brokerages...');
  // Zerodha default Client rules (Percentage)
  await prisma.brokerage.create({
    data: {
      accountId: cli1.id,
      exchangeId: nse.id,
      appliesTo: 'CLIENT',
      type: 'PERCENT',
      scope: 'DEFAULT',
      tradingBuyPct: 0.03,
      tradingSellPct: 0.03,
      tradingMinFee: 20,
    }
  });

  // Angel One default Client rules (Amount/Flat Fee)
  await prisma.brokerage.create({
    data: {
      accountId: cli2.id,
      exchangeId: nse.id,
      appliesTo: 'CLIENT',
      type: 'AMOUNT',
      scope: 'DEFAULT',
      flatFee: 20,
    }
  });

  // 8. Seed Trades
  console.log('Seed Trades...');
  const tradeData = [
    // --- TCS Trades for CLI001 via BRO001 ---
    {
      tradeNumber: 'T-2026-001',
      tradeDate: new Date('2026-06-01T10:15:00Z'),
      accountId: cli1.id,
      brokerId: bro1.id,
      scriptId: scriptMap['TCS'],
      exchangeId: nse.id,
      transactionType: 'BUY',
      quantity: 100,
      rate: 4000.0,
      clientRate: 4001.20,
      brokerRate: 4000.40,
      clientBrokerage: 120.0,
      brokerBrokerage: 40.0,
      profitTotal: 80.0,
      expiry: '2026-06-25',
    },
    {
      tradeNumber: 'T-2026-002',
      tradeDate: new Date('2026-06-03T11:30:00Z'),
      accountId: cli1.id,
      brokerId: bro1.id,
      scriptId: scriptMap['TCS'],
      exchangeId: nse.id,
      transactionType: 'BUY',
      quantity: 100,
      rate: 4100.0,
      clientRate: 4101.23,
      brokerRate: 4100.41,
      clientBrokerage: 123.0,
      brokerBrokerage: 41.0,
      profitTotal: 82.0,
      expiry: '2026-06-25',
    },
    {
      tradeNumber: 'T-2026-003',
      tradeDate: new Date('2026-06-05T14:45:00Z'),
      accountId: cli1.id,
      brokerId: bro1.id,
      scriptId: scriptMap['TCS'],
      exchangeId: nse.id,
      transactionType: 'SELL',
      quantity: 150,
      rate: 4200.0,
      clientRate: 4198.74,
      brokerRate: 4199.58,
      clientBrokerage: 126.0,
      brokerBrokerage: 42.0,
      profitTotal: 84.0,
      expiry: '2026-06-25',
    },

    // --- RELIANCE Trades for CLI001 via BRO001 ---
    {
      tradeNumber: 'T-2026-004',
      tradeDate: new Date('2026-06-02T09:30:00Z'),
      accountId: cli1.id,
      brokerId: bro1.id,
      scriptId: scriptMap['RELIANCE'],
      exchangeId: nse.id,
      transactionType: 'BUY',
      quantity: 50,
      rate: 2800.0,
      clientRate: 2800.84,
      brokerRate: 2800.28,
      clientBrokerage: 42.0,
      brokerBrokerage: 14.0,
      profitTotal: 28.0,
      expiry: '2026-06-25',
    },
    {
      tradeNumber: 'T-2026-005',
      tradeDate: new Date('2026-06-04T13:10:00Z'),
      accountId: cli1.id,
      brokerId: bro1.id,
      scriptId: scriptMap['RELIANCE'],
      exchangeId: nse.id,
      transactionType: 'SELL',
      quantity: 50,
      rate: 2750.0,
      clientRate: 2749.18,
      brokerRate: 2749.73,
      clientBrokerage: 41.25,
      brokerBrokerage: 13.75,
      profitTotal: 27.50,
      expiry: '2026-06-25',
    },

    // --- INFOSYS Trades for CLI002 via BRO002 ---
    {
      tradeNumber: 'T-2026-006',
      tradeDate: new Date('2026-06-02T10:00:00Z'),
      accountId: cli2.id,
      brokerId: bro2.id,
      scriptId: scriptMap['INFOSYS'],
      exchangeId: nse.id,
      transactionType: 'BUY',
      quantity: 200,
      rate: 1500.0,
      clientRate: 1500.10,
      brokerRate: 1500.05,
      clientBrokerage: 20.0,
      brokerBrokerage: 10.0,
      profitTotal: 10.0,
      expiry: '2026-06-25',
    },
    {
      tradeNumber: 'T-2026-007',
      tradeDate: new Date('2026-06-06T12:00:00Z'),
      accountId: cli2.id,
      brokerId: bro2.id,
      scriptId: scriptMap['INFOSYS'],
      exchangeId: nse.id,
      transactionType: 'SELL',
      quantity: 100,
      rate: 1550.0,
      clientRate: 1549.80,
      brokerRate: 1549.90,
      clientBrokerage: 20.0,
      brokerBrokerage: 10.0,
      profitTotal: 10.0,
      expiry: '2026-06-25',
    },

    // --- HDFCBANK Trades for CLI003 via BRO001 ---
    {
      tradeNumber: 'T-2026-008',
      tradeDate: new Date('2026-06-03T11:00:00Z'),
      accountId: cli3.id,
      brokerId: bro1.id,
      scriptId: scriptMap['HDFCBANK'],
      exchangeId: bse.id,
      transactionType: 'SELL',
      quantity: 100,
      rate: 1600.0,
      clientRate: 1599.50,
      brokerRate: 1599.80,
      clientBrokerage: 50.0,
      brokerBrokerage: 20.0,
      profitTotal: 30.0,
      expiry: '2026-06-25',
    },
    {
      tradeNumber: 'T-2026-009',
      tradeDate: new Date('2026-06-07T14:15:00Z'),
      accountId: cli3.id,
      brokerId: bro1.id,
      scriptId: scriptMap['HDFCBANK'],
      exchangeId: bse.id,
      transactionType: 'BUY',
      quantity: 50,
      rate: 1550.0,
      clientRate: 1550.50,
      brokerRate: 1550.20,
      clientBrokerage: 25.0,
      brokerBrokerage: 10.0,
      profitTotal: 15.0,
      expiry: '2026-06-25',
    },

    // --- TATAMOTORS Trades for CLI001 via BRO002 ---
    {
      tradeNumber: 'T-2026-010',
      tradeDate: new Date('2026-06-04T09:45:00Z'),
      accountId: cli1.id,
      brokerId: bro2.id,
      scriptId: scriptMap['TATAMOTORS'],
      exchangeId: nse.id,
      transactionType: 'BUY',
      quantity: 300,
      rate: 900.0,
      clientRate: 900.07,
      brokerRate: 900.03,
      clientBrokerage: 21.0,
      brokerBrokerage: 9.0,
      profitTotal: 12.0,
      expiry: '2026-06-25',
    },
    {
      tradeNumber: 'T-2026-011',
      tradeDate: new Date('2026-06-08T13:20:00Z'),
      accountId: cli1.id,
      brokerId: bro2.id,
      scriptId: scriptMap['TATAMOTORS'],
      exchangeId: nse.id,
      transactionType: 'SELL',
      quantity: 200,
      rate: 930.0,
      clientRate: 929.93,
      brokerRate: 929.97,
      clientBrokerage: 14.0,
      brokerBrokerage: 6.0,
      profitTotal: 8.0,
      expiry: '2026-06-25',
    },
    {
      tradeNumber: 'T-2026-012',
      tradeDate: new Date('2026-06-09T10:10:00Z'),
      accountId: cli1.id,
      brokerId: bro2.id,
      scriptId: scriptMap['TATAMOTORS'],
      exchangeId: nse.id,
      transactionType: 'SELL',
      quantity: 100,
      rate: 910.0,
      clientRate: 909.93,
      brokerRate: 909.97,
      clientBrokerage: 7.0,
      brokerBrokerage: 3.0,
      profitTotal: 4.0,
      expiry: '2026-06-25',
    }
  ];

  for (const t of tradeData) {
    const timePart = t.tradeDate.toISOString().split('T')[1].split('.')[0];
    await prisma.trade.create({
      data: {
        tradeNumber: t.tradeNumber,
        tradeDate: t.tradeDate,
        tradeTime: timePart,
        accountId: t.accountId,
        brokerId: t.brokerId,
        scriptId: t.scriptId,
        exchangeId: t.exchangeId,
        transactionType: t.transactionType,
        quantity: t.quantity,
        rate: t.rate,
        clientRate: t.clientRate,
        brokerRate: t.brokerRate,
        clientBrokerage: t.clientBrokerage,
        brokerBrokerage: t.brokerBrokerage,
        profitTotal: t.profitTotal,
        source: 'MANUAL',
        remarks: 'Seeded test trade',
        expiry: t.expiry,
      }
    });
  }

  // 9. Seed Closing Rates
  console.log('Seed Closing Rates...');
  // Seed closing rates on June 10th, 2026 (the standard toDate we test with)
  const dateJune10 = new Date('2026-06-10T00:00:00Z');
  
  const closingRatesData = [
    { scriptId: scriptMap['TCS'], exchangeId: nse.id, rate: 4250.00 },
    { scriptId: scriptMap['RELIANCE'], exchangeId: nse.id, rate: 2820.00 },
    { scriptId: scriptMap['INFOSYS'], exchangeId: nse.id, rate: 1530.00 },
    { scriptId: scriptMap['HDFCBANK'], exchangeId: bse.id, rate: 1580.00 },
    { scriptId: scriptMap['TATAMOTORS'], exchangeId: nse.id, rate: 920.00 },
  ];

  for (const cr of closingRatesData) {
    await prisma.closingRate.create({
      data: {
        exchangeId: cr.exchangeId,
        scriptId: cr.scriptId,
        rateDate: dateJune10,
        rate: cr.rate,
      }
    });
  }

  console.log('✅ Database seeded successfully with realistic trades, expiries, and closing rates!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });