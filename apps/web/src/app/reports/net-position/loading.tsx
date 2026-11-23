import { StatCardsSkeleton, TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function NetPositionLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton titleWidth="w-56" />
      <StatCardsSkeleton count={3} />
      <TableSkeleton columns={7} rows={8} />
    </div>
  );
}
