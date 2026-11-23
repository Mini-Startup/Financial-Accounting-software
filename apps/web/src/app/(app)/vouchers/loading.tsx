import { Skeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

export default function VouchersLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton titleWidth="w-48" />
      {/* Voucher Entry Form Skeleton */}
      <div className="card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
      {/* Voucher History Skeleton */}
      <TableSkeleton columns={6} rows={6} />
    </div>
  );
}
