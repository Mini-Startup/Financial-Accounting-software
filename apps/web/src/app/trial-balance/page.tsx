import { TrialBalanceManager } from '../../components/trial-balance/TrialBalanceManager';

export const dynamic = 'force-dynamic';

async function safeFetch(url: string, fallback: any = null) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json();
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    return fallback;
  }
}

export default async function TrialBalancePage() {
  const fallbackReport = {
    asOfDate: new Date().toISOString().split('T')[0],
    fromDate: null,
    toDate: null,
    summary: {
      totalAccounts: 0,
      activeAccounts: 0,
      grandTotalOpeningDebit: 0,
      grandTotalOpeningCredit: 0,
      grandTotalPeriodDebit: 0,
      grandTotalPeriodCredit: 0,
      grandTotalClosingDebit: 0,
      grandTotalClosingCredit: 0,
      difference: 0,
      isBalanced: true,
    },
    categories: [],
    groups: [],
    rows: [],
  };

  const [initialReport, groups] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/trial-balance`, fallbackReport),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/groups`, []),
  ]);

  return <TrialBalanceManager initialReport={initialReport || fallbackReport} groups={groups || []} />;
}
