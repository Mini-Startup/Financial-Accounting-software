import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding default File Import Templates and Column Mappings...');

  // 1. Dubai Trade F&O Template
  const dubaiTradeTemplate = await prisma.fileImportTemplate.upsert({
    where: { code: 'DUBAI_FNO_TRADE' },
    update: {
      name: 'Dubai Trade F&O CSV',
      description: 'Gulf commodity, currency, and index futures format with trailing client swap and options filter.',
      importType: 'TRADE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 30,
      signatureHeaders: ['TRADETIME', 'EXCHORDERID', 'CLNCOMMISSION', 'MKTVALUE', 'CALLPUT'],
      optionsFilterRule: {
        columnHeader: 'CALLPUT',
        columnIndex: 10,
        excludeValues: ['OPTIONS', 'P', 'C'],
        strikePriceColumnIndex: 12,
      },
      clientSwapRule: {
        columnIndex: 29,
        ignoreValues: ['NORMAL', 'MEDIUMCARRY', 'FORWARD', 'SPOT'],
      },
      brokerFeeFormula: {
        sumHeaders: ['CLNCOMMISSION', 'CLNEXCHARGES', 'CLNCHARGES1', 'CLNCHARGES2'],
      },
    },
    create: {
      name: 'Dubai Trade F&O CSV',
      code: 'DUBAI_FNO_TRADE',
      description: 'Gulf commodity, currency, and index futures format with trailing client swap and options filter.',
      importType: 'TRADE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 30,
      signatureHeaders: ['TRADETIME', 'EXCHORDERID', 'CLNCOMMISSION', 'MKTVALUE', 'CALLPUT'],
      optionsFilterRule: {
        columnHeader: 'CALLPUT',
        columnIndex: 10,
        excludeValues: ['OPTIONS', 'P', 'C'],
        strikePriceColumnIndex: 12,
      },
      clientSwapRule: {
        columnIndex: 29,
        ignoreValues: ['NORMAL', 'MEDIUMCARRY', 'FORWARD', 'SPOT'],
      },
      brokerFeeFormula: {
        sumHeaders: ['CLNCOMMISSION', 'CLNEXCHARGES', 'CLNCHARGES1', 'CLNCHARGES2'],
      },
    },
  });

  // Dubai Trade F&O Mappings
  const dubaiTradeMappings = [
    { appField: 'clientCode', fileColumnHeader: 'CLIENTCODE', fileColumnIndex: 0, isRequired: true },
    { appField: 'groupCode', fileColumnHeader: 'GROUP_CODE', fileColumnIndex: 1, isRequired: false },
    { appField: 'tradeDate', fileColumnHeader: 'TRADEDATE', fileColumnIndex: 2, isRequired: true, transformRule: 'DATE_DD_MMM_YY' },
    { appField: 'tradeTime', fileColumnHeader: 'TRADETIME', fileColumnIndex: 3, isRequired: false },
    { appField: 'orderNo', fileColumnHeader: 'ORDERNO', fileColumnIndex: 4, isRequired: false },
    { appField: 'marketCode', fileColumnHeader: 'MARKET', fileColumnIndex: 6, isRequired: true },
    { appField: 'tickCode', fileColumnHeader: 'COMMODITY', fileColumnIndex: 7, isRequired: true },
    { appField: 'expiryDate', fileColumnHeader: 'EXPIRY_DATE', fileColumnIndex: 8, isRequired: false },
    { appField: 'delMonth', fileColumnHeader: 'DELMONTH', fileColumnIndex: 9, isRequired: false },
    { appField: 'callPut', fileColumnHeader: 'CALLPUT', fileColumnIndex: 10, isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'STRIKE_PRICE', fileColumnIndex: 12, isRequired: false },
    { appField: 'typeCode', fileColumnHeader: 'BUY_SELL', fileColumnIndex: 13, isRequired: true, transformRule: 'BUY_SELL_MAPPING' },
    { appField: 'quantity', fileColumnHeader: 'QTY', fileColumnIndex: 14, isRequired: true, transformRule: 'FLOAT' },
    { appField: 'rate', fileColumnHeader: 'PRICE', fileColumnIndex: 15, isRequired: true, transformRule: 'FLOAT' },
    { appField: 'clnCommission', fileColumnHeader: 'CLNCOMMISSION', fileColumnIndex: 16, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'clnExCharges', fileColumnHeader: 'CLNEXCHARGES', fileColumnIndex: 17, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'clnCharges1', fileColumnHeader: 'CLNCHARGES1', fileColumnIndex: 18, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'clnCharges2', fileColumnHeader: 'CLNCHARGES2', fileColumnIndex: 19, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'orderType', fileColumnHeader: 'ORDERTYPE', fileColumnIndex: 25, isRequired: false },
    { appField: 'substituteClientCode', fileColumnHeader: null, fileColumnIndex: 29, isRequired: false },
  ];

  for (const m of dubaiTradeMappings) {
    await prisma.fileColumnMapping.upsert({
      where: {
        uq_template_app_field: {
          templateId: dubaiTradeTemplate.id,
          appField: m.appField,
        },
      },
      update: {
        fileColumnHeader: m.fileColumnHeader,
        fileColumnIndex: m.fileColumnIndex,
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
      create: {
        templateId: dubaiTradeTemplate.id,
        appField: m.appField,
        fileColumnHeader: m.fileColumnHeader,
        fileColumnIndex: m.fileColumnIndex,
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
    });
  }

  // 2. Open Position & Closing Rates Template
  const closingRateTemplate = await prisma.fileImportTemplate.upsert({
    where: { code: 'BROKER_OPEN_POSITIONS' },
    update: {
      name: 'Broker Open Positions & Closing Rates CSV',
      description: 'Daily open positions CSV used for closing rates extraction and position reconciliation.',
      importType: 'CLOSING_RATE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 18,
      signatureHeaders: ['COMMODITY_CODE', 'CLOSING_PRICE', 'NET_LOTS'],
    },
    create: {
      name: 'Broker Open Positions & Closing Rates CSV',
      code: 'BROKER_OPEN_POSITIONS',
      description: 'Daily open positions CSV used for closing rates extraction and position reconciliation.',
      importType: 'CLOSING_RATE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 18,
      signatureHeaders: ['COMMODITY_CODE', 'CLOSING_PRICE', 'NET_LOTS'],
    },
  });

  // Open Position Mappings
  const closingRateMappings = [
    { appField: 'exchangeCode', fileColumnHeader: 'EXCHANGE', alternateHeaders: ['MARKET', 'EXCH'], isRequired: true },
    { appField: 'commodityCode', fileColumnHeader: 'COMMODITY_CODE', alternateHeaders: ['COMMODITY', 'TICKCODE'], isRequired: true },
    { appField: 'closingPrice', fileColumnHeader: 'CLOSING_PRICE', alternateHeaders: ['CLOSE_PRICE', 'CLOSING_RATE', 'PRICE'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'expiryDate', fileColumnHeader: 'EXPIRY_DATE', alternateHeaders: ['EXPIRY'], isRequired: false },
    { appField: 'delMonth', fileColumnHeader: 'DELMONTH', alternateHeaders: ['DEL_MONTH'], isRequired: false },
    { appField: 'callPut', fileColumnHeader: 'CALLPUT', alternateHeaders: ['CALL_PUT'], isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'STRIKE_PRICE', alternateHeaders: ['STRIKE'], isRequired: false },
    { appField: 'clientCode', fileColumnHeader: 'CLIENTCODE', alternateHeaders: ['CLIENT_CODE'], isRequired: false },
    { appField: 'netLots', fileColumnHeader: 'NET_LOTS', alternateHeaders: ['NET_QTY'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'currencyCode', fileColumnHeader: 'CURRENCY', alternateHeaders: ['CURR'], isRequired: false },
  ];

  for (const m of closingRateMappings) {
    await prisma.fileColumnMapping.upsert({
      where: {
        uq_template_app_field: {
          templateId: closingRateTemplate.id,
          appField: m.appField,
        },
      },
      update: {
        fileColumnHeader: m.fileColumnHeader,
        alternateHeaders: m.alternateHeaders || [],
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
      create: {
        templateId: closingRateTemplate.id,
        appField: m.appField,
        fileColumnHeader: m.fileColumnHeader,
        alternateHeaders: m.alternateHeaders || [],
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
