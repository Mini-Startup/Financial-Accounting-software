import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function SettlementDetailLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-56" />
      <TableSkeleton columns={9} rows={10} />
    </div>
  );
}
