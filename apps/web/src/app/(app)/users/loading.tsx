import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-52" />
      <TableSkeleton columns={6} rows={8} />
    </div>
  );
}
