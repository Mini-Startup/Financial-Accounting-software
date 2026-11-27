import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Net Position Report | BizzMate Accounting',
  description: 'Live unsettled position exposure aggregated by Client, Broker, or Script with MTM valuation.',
};

export default function NetPositionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
