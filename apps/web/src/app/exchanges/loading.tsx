import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function ExchangesLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-36" />
      <TableSkeleton columns={3} rows={10} />
    </div>
  );
}
