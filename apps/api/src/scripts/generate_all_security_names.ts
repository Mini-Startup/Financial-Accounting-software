import 'dotenv/config';
import { prisma } from '../database';
import { generateSecurityName } from '../features/trades/securityName';

async function main() {
  console.log('Fetching all trades from database...');
  const trades = await prisma.trade.findMany({
    include: {
      script: true,
    },
    orderBy: { tradeDate: 'asc' },
  });

  console.log(`Found ${trades.length} total trades in database.`);
  let updatedCount = 0;
  let alreadyCorrect = 0;

  for (const t of trades) {
    const canonicalName = generateSecurityName({
      scriptFullName: t.script?.fullName || t.script?.shortName,
      scriptShortName: t.script?.shortName,
      expiry: t.expiry,
      callPut: t.callPut,
      strikePrice: t.strikePrice,
    });

    if (!canonicalName) {
      console.warn(`[WARN] Trade ${t.tradeNumber || t.id}: Could not generate security name (script: ${t.script?.shortName || t.scriptId}, expiry: ${t.expiry})`);
      continue;
    }

    if (t.securityName !== canonicalName) {
      console.log(`[UPDATE] Trade ${t.tradeNumber || t.id}: "${t.securityName || '(empty)'}" -> "${canonicalName}"`);
      await prisma.trade.update({
        where: { id: t.id },
        data: { securityName: canonicalName },
      });
      updatedCount++;
    } else {
      alreadyCorrect++;
    }
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY:`);
  console.log(`Total trades: ${trades.length}`);
  console.log(`Updated securityName: ${updatedCount}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error generating security names:', err);
  process.exit(1);
});
