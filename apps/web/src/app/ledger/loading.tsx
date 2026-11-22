import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function LedgerLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-36" />
      <TableSkeleton columns={6} rows={12} />
    </div>
  );
}
