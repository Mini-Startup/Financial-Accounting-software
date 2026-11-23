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

  // 3. Elec Trade Template
  const elecTradeTemplate = await prisma.fileImportTemplate.upsert({
    where: { code: 'ELEC_TRADE' },
    update: {
      name: 'Elec Broker Trade CSV',
      description: 'Elec broker commodities and futures trade format with direct brokerage and TradeRefNo.',
      importType: 'TRADE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 20,
      signatureHeaders: ['CUSTCODE', 'INSTUMENT', 'TRADEREFNO', 'QTY/LOT', 'TRADEPRICE'],
      optionsFilterRule: {
        columnHeader: 'CallPut',
        excludeValues: ['P', 'C'],
        remarksExclude: ['EXPIRE'],
      },
    },
    create: {
      name: 'Elec Broker Trade CSV',
      code: 'ELEC_TRADE',
      description: 'Elec broker commodities and futures trade format with direct brokerage and TradeRefNo.',
      importType: 'TRADE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 20,
      signatureHeaders: ['CUSTCODE', 'INSTUMENT', 'TRADEREFNO', 'QTY/LOT', 'TRADEPRICE'],
      optionsFilterRule: {
        columnHeader: 'CallPut',
        excludeValues: ['P', 'C'],
        remarksExclude: ['EXPIRE'],
      },
    },
  });

  const elecTradeMappings = [
    { appField: 'clientCode', fileColumnHeader: 'CustCode', alternateHeaders: ['CLIENTCODE', 'CUST_CODE'], isRequired: true },
    { appField: 'groupCode', fileColumnHeader: 'GroupCode', alternateHeaders: ['GROUP_CODE'], isRequired: false },
    { appField: 'tradeDate', fileColumnHeader: 'TradeDate', alternateHeaders: ['TRADEDATE'], isRequired: true, transformRule: 'DATE_MM_DD_YYYY' },
    { appField: 'tradeTime', fileColumnHeader: 'TradeTime', alternateHeaders: ['TRADETIME'], isRequired: false },
    { appField: 'exchangeCode', fileColumnHeader: 'Exchange', alternateHeaders: ['MARKET', 'MARKETCODE'], isRequired: true },
    { appField: 'tickCode', fileColumnHeader: 'ContractCode', alternateHeaders: ['COMMODITY', 'TICKCODE'], isRequired: true },
    { appField: 'securityName', fileColumnHeader: 'Instument', alternateHeaders: ['INSTRUMENT', 'SECURITYNAME'], isRequired: true },
    { appField: 'deliveryMonth', fileColumnHeader: 'DeliveryMonth', alternateHeaders: ['DELMONTH'], isRequired: false },
    { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', alternateHeaders: ['EXPIRY_DATE'], isRequired: false, transformRule: 'DATE_MM_DD_YYYY' },
    { appField: 'currency', fileColumnHeader: 'Currency', alternateHeaders: ['CURRENCYCODE'], isRequired: false },
    { appField: 'callPut', fileColumnHeader: 'CallPut', alternateHeaders: ['CALL_PUT'], isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'Strike', alternateHeaders: ['STRIKE_PRICE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'buySell', fileColumnHeader: 'BuySell', alternateHeaders: ['BUYSELLFLAG', 'SIDE'], isRequired: true },
    { appField: 'quantity', fileColumnHeader: 'Qty/Lot', alternateHeaders: ['QTY', 'QUANTITY'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'price', fileColumnHeader: 'TradePrice', alternateHeaders: ['PRICE', 'RATE'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'tradeValue', fileColumnHeader: 'TradeValue', alternateHeaders: ['MKTVALUE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'orderId', fileColumnHeader: 'TradeRefNo', alternateHeaders: ['ORDERNO', 'REFNO'], isRequired: false },
    { appField: 'marketLot', fileColumnHeader: 'LotSize', alternateHeaders: ['MARKETLOT'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'brokerage', fileColumnHeader: 'Brokerage', alternateHeaders: ['COMMISSION'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'remarks', fileColumnHeader: 'Remarks', isRequired: false },
  ];

  for (const m of elecTradeMappings) {
    await prisma.fileColumnMapping.upsert({
      where: {
        uq_template_app_field: {
          templateId: elecTradeTemplate.id,
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
        templateId: elecTradeTemplate.id,
        appField: m.appField,
        fileColumnHeader: m.fileColumnHeader,
        alternateHeaders: m.alternateHeaders || [],
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
    });
  }

  // 4. Elec Open Positions & Closing Rates Template
  const elecClosingRateTemplate = await prisma.fileImportTemplate.upsert({
    where: { code: 'ELEC_OPEN_POSITIONS' },
    update: {
      name: 'Elec Broker Open Positions & Closing Rates CSV',
      description: 'Elec broker open positions CSV with SettlPrice and FUTCOM commodity futures.',
      importType: 'CLOSING_RATE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 18,
      signatureHeaders: ['INSTTYPECODE', 'SETTLPRICE', 'UNREALIZEDPNL', 'CONTRACTNAME'],
      optionsFilterRule: {
        columnHeader: 'InstTypeCode',
        includeValues: ['FUTCOM'],
        excludeValues: ['OPTCOM'],
      },
    },
    create: {
      name: 'Elec Broker Open Positions & Closing Rates CSV',
      code: 'ELEC_OPEN_POSITIONS',
      description: 'Elec broker open positions CSV with SettlPrice and FUTCOM commodity futures.',
      importType: 'CLOSING_RATE',
      formatType: 'CSV',
      delimiter: ',',
      hasHeader: true,
      headerRowIndex: 0,
      dataStartRow: 1,
      expectedColCount: 18,
      signatureHeaders: ['INSTTYPECODE', 'SETTLPRICE', 'UNREALIZEDPNL', 'CONTRACTNAME'],
      optionsFilterRule: {
        columnHeader: 'InstTypeCode',
        includeValues: ['FUTCOM'],
        excludeValues: ['OPTCOM'],
      },
    },
  });

  const elecClosingRateMappings = [
    { appField: 'clientCode', fileColumnHeader: 'CustCode', alternateHeaders: ['CLIENTCODE'], isRequired: false },
    { appField: 'groupCode', fileColumnHeader: 'GroupCode', alternateHeaders: ['GROUP_CODE'], isRequired: false },
    { appField: 'exchangeCode', fileColumnHeader: 'Exchange', alternateHeaders: ['MARKET', 'EXCH'], isRequired: true },
    { appField: 'commodityCode', fileColumnHeader: 'ContractCode', alternateHeaders: ['COMMODITY_CODE', 'COMMODITY'], isRequired: true },
    { appField: 'contractName', fileColumnHeader: 'ContractName', isRequired: false },
    { appField: 'securityName', fileColumnHeader: 'Instrument', isRequired: false },
    { appField: 'closingPrice', fileColumnHeader: 'SettlPrice', alternateHeaders: ['CLOSING_PRICE', 'SETTLEMENT_PRICE'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'boughtLots', fileColumnHeader: 'BUY', isRequired: false, transformRule: 'FLOAT' },
    { appField: 'soldLots', fileColumnHeader: 'SELL', isRequired: false, transformRule: 'FLOAT' },
    { appField: 'deliveryMonth', fileColumnHeader: 'DeliveryMonth', alternateHeaders: ['DELMONTH'], isRequired: false },
    { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', alternateHeaders: ['EXPIRY_DATE'], isRequired: false, transformRule: 'DATE_MM_DD_YYYY' },
    { appField: 'callPut', fileColumnHeader: 'CallPut', alternateHeaders: ['CALL_PUT'], isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'Strike', alternateHeaders: ['STRIKE_PRICE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'tradePrice', fileColumnHeader: 'TradePrice', alternateHeaders: ['OPEN_PRICE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'currencyCode', fileColumnHeader: 'Currency', alternateHeaders: ['CURR'], isRequired: false },
    { appField: 'unrealizedPnl', fileColumnHeader: 'UnRealizedPnl', alternateHeaders: ['VARIANCE_MARGIN'], isRequired: false, transformRule: 'FLOAT' },
  ];

  for (const m of elecClosingRateMappings) {
    await prisma.fileColumnMapping.upsert({
      where: {
        uq_template_app_field: {
          templateId: elecClosingRateTemplate.id,
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
        templateId: elecClosingRateTemplate.id,
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
