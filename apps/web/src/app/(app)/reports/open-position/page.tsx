import { Metadata } from 'next';
import NetPositionReportPage from '../net-position/page';

export const metadata: Metadata = {
  title: 'Open Position Report | BizzMate FAS',
  description: 'Real-time open positions, exposures, margins, and MTM grouped by client, broker, or script.',
};

export default function OpenPositionPage() {
  return <NetPositionReportPage />;
}
