import { StatCardsSkeleton, TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function SettlementSummaryLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton titleWidth="w-56" />
      <StatCardsSkeleton count={4} />
      <TableSkeleton columns={8} rows={8} />
    </div>
  );
}
