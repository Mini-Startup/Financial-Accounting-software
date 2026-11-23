import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function OpenPositionLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-48" />
      <TableSkeleton columns={8} rows={12} />
    </div>
  );
}
