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
  const expiryDates = await safeFetch('http://localhost:4000/expiry-dates');
  return <ExpiryDatePageManager initialExpiryDates={expiryDates} />;
}
