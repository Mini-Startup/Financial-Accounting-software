import { TradeImportManager } from '../../../components/trades/TradeImportManager';

export const metadata = {
  title: 'Trade Import — BizzMate Financial',
  description: 'Import and process trade files from broker CSV/text exports',
};

export default function TradeImportPage() {
  return <TradeImportManager />;
}
