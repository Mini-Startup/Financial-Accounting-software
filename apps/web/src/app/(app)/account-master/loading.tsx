import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function AccountMasterLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-52" />
      <TableSkeleton columns={7} rows={10} />
    </div>
  );
}
