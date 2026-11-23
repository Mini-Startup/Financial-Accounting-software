import type { Metadata } from 'next';
import { safeServerFetch } from '@/utils/serverApi';
import { ExpiryDatePageManager } from '@/components/expiry-dates/ExpiryDatePageManager';

export const metadata: Metadata = {
  title: 'Expiry Dates | BizzMate Accounting',
  description: 'Manage derivatives and futures contract expiry dates and activation status.',
};

export const dynamic = 'force-dynamic';

export default async function ExpiryDatesPage() {
  const expiries = await safeServerFetch('/expiry-dates', []);
  return <ExpiryDatePageManager initialExpiries={expiries} />;
}
