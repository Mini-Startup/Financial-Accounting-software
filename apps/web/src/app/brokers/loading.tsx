import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function BrokersLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-44" />
      <TableSkeleton columns={7} rows={10} />
    </div>
  );
}
