import { ExpiryDatePageManager } from '../../components/expiry-dates/ExpiryDatePageManager';

export const dynamic = 'force-dynamic';

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function ExpiryDatesPage() {
  const expiryDates = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL}/expiry-dates`);
  return <ExpiryDatePageManager initialExpiryDates={expiryDates} />;
}
