import { VoucherForm } from '../../components/vouchers/VoucherForm';

export const dynamic = 'force-dynamic';

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    return [];
  }
}

export default async function VouchersPage() {
  const [accounts, vouchers] = await Promise.all([
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`),
    safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/vouchers`),
  ]);

  return <VoucherForm accounts={accounts} initialVouchers={vouchers} />;
}
