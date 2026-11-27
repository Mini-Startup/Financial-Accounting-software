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
    { appField: 'typeCode', fileColumnHeader: 'TypeCode', fileColumnIndex: 0, isRequired: false },
    { appField: 'tradeDate', fileColumnHeader: 'TradeDate', fileColumnIndex: 1, isRequired: true, transformRule: 'DATE_DD_MMM_YY' },
    { appField: 'tradeTime', fileColumnHeader: 'TradeTime', fileColumnIndex: 2, isRequired: false },
    { appField: 'clientCode', fileColumnHeader: 'ClientCode', fileColumnIndex: 3, isRequired: true },
    { appField: 'marketCode', fileColumnHeader: 'MarketCode', fileColumnIndex: 4, isRequired: true },
    { appField: 'securityCode', fileColumnHeader: 'Security Code', fileColumnIndex: 5, isRequired: false },
    { appField: 'currency', fileColumnHeader: 'Currencycode', fileColumnIndex: 6, isRequired: false },
    { appField: 'securityName', fileColumnHeader: 'SecurityName', fileColumnIndex: 7, isRequired: true },
    { appField: 'delMonth', fileColumnHeader: 'DelMonth', fileColumnIndex: 8, isRequired: false },
    { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', fileColumnIndex: 9, isRequired: false, transformRule: 'DATE_DD_MMM_YY' },
    { appField: 'marketLot', fileColumnHeader: 'MarketLot', fileColumnIndex: 10, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'callPut', fileColumnHeader: 'CallPut', fileColumnIndex: 11, isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'StrikePrice', fileColumnIndex: 12, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'tickCode', fileColumnHeader: 'Tickcode', fileColumnIndex: 13, isRequired: true },
    { appField: 'bloombergCode', fileColumnHeader: 'Bloomberg_Code', fileColumnIndex: 14, isRequired: false },
    { appField: 'buySell', fileColumnHeader: 'BuySellFlag', fileColumnIndex: 15, isRequired: true, transformRule: 'BUY_SELL' },
    { appField: 'quantity', fileColumnHeader: 'Qty', fileColumnIndex: 16, isRequired: true, transformRule: 'FLOAT' },
    { appField: 'price', fileColumnHeader: 'Price', fileColumnIndex: 17, isRequired: true, transformRule: 'FLOAT' },
    { appField: 'tradeValue', fileColumnHeader: 'MktValue', fileColumnIndex: 18, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'statementDate', fileColumnHeader: 'StatementDate', fileColumnIndex: 19, isRequired: false },
    { appField: 'clnCommission', fileColumnHeader: 'ClnCommission', fileColumnIndex: 20, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'clnExCharges', fileColumnHeader: 'ClnExCharges', fileColumnIndex: 21, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'clnCharges1', fileColumnHeader: 'ClnCharges1', fileColumnIndex: 22, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'clnCharges2', fileColumnHeader: 'ClnCharges2', fileColumnIndex: 23, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'vat', fileColumnHeader: 'Vat', fileColumnIndex: 24, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'orderId', fileColumnHeader: 'ExchOrderID', fileColumnIndex: 25, isRequired: false },
    { appField: 'platformOrderId', fileColumnHeader: 'Platform_OrderID', fileColumnIndex: 26, isRequired: false },
    { appField: 'settlementId', fileColumnHeader: 'SettlementId', fileColumnIndex: 27, isRequired: false },
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
    { appField: 'clientCode', fileColumnHeader: 'CLIENTCODE', fileColumnIndex: 0, alternateHeaders: ['CLIENT_CODE'], isRequired: false },
    { appField: 'groupCode', fileColumnHeader: 'GROUP_CODE', fileColumnIndex: 1, isRequired: false },
    { appField: 'exchangeCode', fileColumnHeader: 'EXCHANGE', fileColumnIndex: 2, alternateHeaders: ['MARKET', 'EXCH'], isRequired: true },
    { appField: 'commodityCode', fileColumnHeader: 'COMMODITY_CODE', fileColumnIndex: 3, alternateHeaders: ['COMMODITY', 'TICKCODE'], isRequired: true },
    { appField: 'expiryDate', fileColumnHeader: 'EXPIRY_DATE', fileColumnIndex: 4, alternateHeaders: ['EXPIRY'], isRequired: false },
    { appField: 'callPut', fileColumnHeader: 'CallPut', fileColumnIndex: 5, alternateHeaders: ['CALL_PUT'], isRequired: false },
    { appField: 'futureOption', fileColumnHeader: 'FUTURE_OPTION', fileColumnIndex: 6, isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'STRIKE_PRICE', fileColumnIndex: 7, alternateHeaders: ['STRIKE'], isRequired: false },
    { appField: 'boughtLots', fileColumnHeader: 'Bought_Lots', fileColumnIndex: 9, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'soldLots', fileColumnHeader: 'Sold_Lots', fileColumnIndex: 10, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'netLots', fileColumnHeader: 'NET_LOTS', fileColumnIndex: 11, alternateHeaders: ['NET_QTY'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'unrealizedPnl', fileColumnHeader: 'VARIANCE_MARGIN', fileColumnIndex: 12, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'tradePrice', fileColumnHeader: 'OPEN_PRICE', fileColumnIndex: 13, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'closingPrice', fileColumnHeader: 'CLOSING_PRICE', fileColumnIndex: 14, alternateHeaders: ['CLOSE_PRICE', 'CLOSING_RATE', 'PRICE'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'currencyCode', fileColumnHeader: 'CURRENCY', fileColumnIndex: 16, alternateHeaders: ['CURR'], isRequired: false },
    { appField: 'delMonth', fileColumnHeader: 'DELMONTH', fileColumnIndex: 17, alternateHeaders: ['DEL_MONTH'], isRequired: false },
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
        fileColumnIndex: m.fileColumnIndex,
        alternateHeaders: m.alternateHeaders || [],
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
      create: {
        templateId: closingRateTemplate.id,
        appField: m.appField,
        fileColumnHeader: m.fileColumnHeader,
        fileColumnIndex: m.fileColumnIndex,
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
    { appField: 'tradeDate', fileColumnHeader: 'TradeDate', fileColumnIndex: 0, alternateHeaders: ['TRADEDATE'], isRequired: true, transformRule: 'DATE_MM_DD_YYYY' },
    { appField: 'tradeTime', fileColumnHeader: 'TradeTime', fileColumnIndex: 1, alternateHeaders: ['TRADETIME'], isRequired: false },
    { appField: 'groupCode', fileColumnHeader: 'GroupCode', fileColumnIndex: 2, alternateHeaders: ['GROUP_CODE'], isRequired: false },
    { appField: 'clientCode', fileColumnHeader: 'CustCode', fileColumnIndex: 3, alternateHeaders: ['CLIENTCODE', 'CUST_CODE'], isRequired: true },
    { appField: 'exchangeCode', fileColumnHeader: 'Exchange', fileColumnIndex: 4, alternateHeaders: ['MARKET', 'MARKETCODE'], isRequired: true },
    { appField: 'securityName', fileColumnHeader: 'Instument', fileColumnIndex: 5, alternateHeaders: ['INSTRUMENT', 'SECURITYNAME'], isRequired: true },
    { appField: 'tickCode', fileColumnHeader: 'ContractCode', fileColumnIndex: 6, alternateHeaders: ['COMMODITY', 'TICKCODE'], isRequired: true },
    { appField: 'deliveryMonth', fileColumnHeader: 'DeliveryMonth', fileColumnIndex: 7, alternateHeaders: ['DELMONTH'], isRequired: false },
    { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', fileColumnIndex: 8, alternateHeaders: ['EXPIRY_DATE'], isRequired: false, transformRule: 'DATE_MM_DD_YYYY' },
    { appField: 'currency', fileColumnHeader: 'Currency', fileColumnIndex: 9, alternateHeaders: ['CURRENCYCODE'], isRequired: false },
    { appField: 'callPut', fileColumnHeader: 'CallPut', fileColumnIndex: 10, alternateHeaders: ['CALL_PUT'], isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'Strike', fileColumnIndex: 11, alternateHeaders: ['STRIKE_PRICE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'buySell', fileColumnHeader: 'BuySell', fileColumnIndex: 12, alternateHeaders: ['BUYSELLFLAG', 'SIDE'], isRequired: true, transformRule: 'BUY_SELL' },
    { appField: 'quantity', fileColumnHeader: 'Qty/Lot', fileColumnIndex: 13, alternateHeaders: ['QTY', 'QUANTITY'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'price', fileColumnHeader: 'TradePrice', fileColumnIndex: 14, alternateHeaders: ['PRICE', 'RATE'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'tradeValue', fileColumnHeader: 'TradeValue', fileColumnIndex: 15, alternateHeaders: ['MKTVALUE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'orderId', fileColumnHeader: 'TradeRefNo', fileColumnIndex: 16, alternateHeaders: ['ORDERNO', 'REFNO'], isRequired: false },
    { appField: 'marketLot', fileColumnHeader: 'LotSize', fileColumnIndex: 17, alternateHeaders: ['MARKETLOT'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'brokerage', fileColumnHeader: 'Brokerage', fileColumnIndex: 18, alternateHeaders: ['COMMISSION'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'remarks', fileColumnHeader: 'Remarks', fileColumnIndex: 19, isRequired: false },
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
        fileColumnIndex: m.fileColumnIndex,
        alternateHeaders: m.alternateHeaders || [],
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
      create: {
        templateId: elecTradeTemplate.id,
        appField: m.appField,
        fileColumnHeader: m.fileColumnHeader,
        fileColumnIndex: m.fileColumnIndex,
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
    { appField: 'groupCode', fileColumnHeader: 'GroupCode', fileColumnIndex: 0, alternateHeaders: ['GROUP_CODE'], isRequired: false },
    { appField: 'clientCode', fileColumnHeader: 'CustCode', fileColumnIndex: 1, alternateHeaders: ['CLIENTCODE'], isRequired: false },
    { appField: 'exchangeCode', fileColumnHeader: 'Exchange', fileColumnIndex: 3, alternateHeaders: ['MARKET', 'EXCH'], isRequired: true },
    { appField: 'futureOption', fileColumnHeader: 'InstTypeCode', fileColumnIndex: 4, isRequired: false },
    { appField: 'commodityCode', fileColumnHeader: 'ContractCode', fileColumnIndex: 5, alternateHeaders: ['COMMODITY_CODE', 'COMMODITY'], isRequired: true },
    { appField: 'contractName', fileColumnHeader: 'ContractName', fileColumnIndex: 6, isRequired: false },
    { appField: 'securityName', fileColumnHeader: 'Instrument', fileColumnIndex: 7, isRequired: false },
    { appField: 'boughtLots', fileColumnHeader: 'BUY', fileColumnIndex: 8, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'soldLots', fileColumnHeader: 'SELL', fileColumnIndex: 9, isRequired: false, transformRule: 'FLOAT' },
    { appField: 'deliveryMonth', fileColumnHeader: 'DeliveryMonth', fileColumnIndex: 10, alternateHeaders: ['DELMONTH'], isRequired: false },
    { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', fileColumnIndex: 11, alternateHeaders: ['EXPIRY_DATE'], isRequired: false, transformRule: 'DATE_MM_DD_YYYY' },
    { appField: 'callPut', fileColumnHeader: 'CallPut', fileColumnIndex: 12, alternateHeaders: ['CALL_PUT'], isRequired: false },
    { appField: 'strikePrice', fileColumnHeader: 'Strike', fileColumnIndex: 13, alternateHeaders: ['STRIKE_PRICE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'tradePrice', fileColumnHeader: 'TradePrice', fileColumnIndex: 14, alternateHeaders: ['OPEN_PRICE'], isRequired: false, transformRule: 'FLOAT' },
    { appField: 'closingPrice', fileColumnHeader: 'SettlPrice', fileColumnIndex: 15, alternateHeaders: ['CLOSING_PRICE', 'SETTLEMENT_PRICE'], isRequired: true, transformRule: 'FLOAT' },
    { appField: 'currencyCode', fileColumnHeader: 'Currency', fileColumnIndex: 16, alternateHeaders: ['CURR'], isRequired: false },
    { appField: 'unrealizedPnl', fileColumnHeader: 'UnRealizedPnl', fileColumnIndex: 17, alternateHeaders: ['VARIANCE_MARGIN'], isRequired: false, transformRule: 'FLOAT' },
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
        fileColumnIndex: m.fileColumnIndex,
        alternateHeaders: m.alternateHeaders || [],
        isRequired: m.isRequired,
        transformRule: m.transformRule || null,
      },
      create: {
        templateId: elecClosingRateTemplate.id,
        appField: m.appField,
        fileColumnHeader: m.fileColumnHeader,
        fileColumnIndex: m.fileColumnIndex,
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
