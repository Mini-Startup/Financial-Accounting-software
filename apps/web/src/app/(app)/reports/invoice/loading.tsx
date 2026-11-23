import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

export default function InvoiceReportLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton titleWidth="w-40" />
      <TableSkeleton columns={7} rows={12} />
    </div>
  );
}
