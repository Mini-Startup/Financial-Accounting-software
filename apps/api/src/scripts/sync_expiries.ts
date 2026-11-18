import 'dotenv/config';
import { prisma } from '../database';

async function main() {
  const trades = await prisma.trade.findMany({
    select: { expiry: true },
    where: { isDeleted: false, expiry: { not: null } },
  });

  const rawExpiries = Array.from(new Set(trades.map((t) => t.expiry).filter(Boolean))) as string[];
  console.log(`Found ${rawExpiries.length} unique expiry dates in active trades:`, rawExpiries);

  for (const exp of rawExpiries) {
    const trimmed = exp.trim();
    if (!trimmed) continue;
    const dateObj = new Date(trimmed);
    const normalized = isNaN(dateObj.getTime()) ? new Date() : dateObj;

    await prisma.expiryDate.upsert({
      where: { date: trimmed },
      update: { isDeleted: false, isActive: true },
      create: {
        date: trimmed,
        normalizedDate: normalized,
        isActive: true,
        isDeleted: false,
      },
    });
  }

  const all = await prisma.expiryDate.findMany({ where: { isDeleted: false } });
  console.log(`Expiry dates currently in database: ${all.length}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
