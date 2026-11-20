import { Metadata } from 'next';
import SettlementDetailPage from '../settlement-detail/page';

export const metadata: Metadata = {
  title: 'Settlement Report | BizzMate FAS',
  description: 'Detailed trade-by-trade audit trail of settled positions grouped by client, broker, or script.',
};

export default function SettlementReportPage() {
  return <SettlementDetailPage />;
}
