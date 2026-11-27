import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function ExpiryDatesLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-36" />
      <TableSkeleton columns={4} rows={10} />
    </div>
  );
}
