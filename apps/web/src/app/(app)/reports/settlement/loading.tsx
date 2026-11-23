import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function SettlementReportLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-44" />
      <TableSkeleton columns={7} rows={12} />
    </div>
  );
}
