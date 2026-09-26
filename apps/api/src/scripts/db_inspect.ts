import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
console.log('Connecting to:', connectionString?.replace(/:[^:@]+@/, ':***@'));

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. List all settlements
  const settlements = await prisma.settlement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { trades: true } } },
  });
  console.log('\n=== SETTLEMENTS ===');
  if (settlements.length === 0) {
    console.log('  (none)');
  }
  for (const s of settlements) {
    console.log(`  ${s.name} | from: ${s.fromDate.toISOString().split('T')[0]} | to: ${s.toDate.toISOString().split('T')[0]} | trades: ${s._count.trades} | id: ${s.id}`);
  }

  // 2. Count trades by type & source
  const tradeCounts: any[] = await prisma.$queryRawUnsafe(`
    SELECT trade_type, source, COUNT(*)::int as count 
    FROM trades 
    GROUP BY trade_type, source
    ORDER BY trade_type, source
  `);
  console.log('\n=== TRADE COUNTS BY TYPE & SOURCE ===');
  for (const tc of tradeCounts) {
    console.log(`  ${tc.trade_type} | ${tc.source} | count: ${tc.count}`);
  }

  // 3. Count SYSTEM trades not in a settlement
  const systemUnsettled = await prisma.trade.count({
    where: { source: 'SYSTEM', settlementId: null },
  });
  console.log(`\nSYSTEM TRADES WITHOUT SETTLEMENT_ID: ${systemUnsettled}`);

  // 4. Sample of SYSTEM trades
  const sampleSystemTrades = await prisma.trade.findMany({
    where: { source: 'SYSTEM' },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tradeNumber: true,
      tradeType: true,
      tradeDate: true,
      transactionType: true,
      quantity: true,
      rate: true,
      remarks: true,
      settlementId: true,
      source: true,
      securityName: true,
    },
  });
  console.log('\n=== SAMPLE SYSTEM TRADES (newest 10) ===');
  for (const t of sampleSystemTrades) {
    console.log(`  ${t.tradeNumber} | ${t.tradeType} | ${t.tradeDate.toISOString().split('T')[0]} | ${t.transactionType} | qty:${t.quantity} | rate:${t.rate} | ${t.securityName} | settId:${t.settlementId || 'null'} | ${t.remarks}`);
  }

  // 5. Count ledger entries by type
  const ledgerCounts = await prisma.ledger.groupBy({
    by: ['entryType'],
    _count: { id: true },
  });
  console.log('\n=== LEDGER ENTRY COUNTS ===');
  for (const lc of ledgerCounts) {
    console.log(`  ${lc.entryType}: ${lc._count.id}`);
  }

  // 6. Total trades 
  const totalTrades = await prisma.trade.count();
  console.log(`\nTOTAL TRADES: ${totalTrades}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
