import { FullPageSkeleton } from '@/components/ui/Skeleton';

export default function RootLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <FullPageSkeleton showStats={true} columns={6} rows={8} />
    </div>
  );
}
