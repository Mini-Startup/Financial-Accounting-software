import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function ClosingRatesLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-40" />
      <TableSkeleton columns={6} rows={10} />
    </div>
  );
}
