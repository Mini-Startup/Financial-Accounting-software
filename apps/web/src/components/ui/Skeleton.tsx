'use client';

import React from 'react';
import { cn } from '@/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base shimmer element with smooth pulse
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800/80 select-none pointer-events-none',
        className
      )}
      {...props}
    />
  );
}

/**
 * Page Header Skeleton with Title and Action Button
 */
export function PageHeaderSkeleton({
  titleWidth = 'w-48',
  hasAction = true,
}: {
  titleWidth?: string;
  hasAction?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="space-y-1.5">
        <Skeleton className={cn('h-7', titleWidth)} />
        <Skeleton className="h-3.5 w-64" />
      </div>
      {hasAction && <Skeleton className="h-9 w-32 rounded-lg" />}
    </div>
  );
}

/**
 * KPI Stat Cards Skeleton Grid
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Toolbar Skeleton
 */
export function TableToolbarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
      <div className="flex items-center gap-2 w-full sm:w-80">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Full Realistic Data Table Skeleton
 */
export function TableSkeleton({
  columns = 7,
  rows = 8,
  showToolbar = true,
  showPagination = true,
}: {
  columns?: number;
  rows?: number;
  showToolbar?: boolean;
  showPagination?: boolean;
}) {
  return (
    <div className="space-y-3 w-full">
      {showToolbar && <TableToolbarSkeleton />}

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {/* Table Header */}
        <div className="border-b border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                'h-3.5',
                i === 0 ? 'w-20' : i === 1 ? 'w-36' : i === columns - 1 ? 'w-16' : 'w-24'
              )}
            />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/40"
            >
              {Array.from({ length: columns }).map((_, colIdx) => {
                // Vary width slightly for realistic text appearance
                const widths = ['w-16', 'w-32', 'w-24', 'w-20', 'w-28', 'w-14', 'w-16'];
                const w = widths[colIdx % widths.length];
                return <Skeleton key={colIdx} className={cn('h-4', w)} />;
              })}
            </div>
          ))}
        </div>

        {/* Table Pagination */}
        {showPagination && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <Skeleton className="h-3.5 w-36" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Full Page Skeleton View
 */
export function FullPageSkeleton({
  titleWidth = 'w-48',
  showStats = false,
  columns = 7,
  rows = 10,
}: {
  titleWidth?: string;
  showStats?: boolean;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeaderSkeleton titleWidth={titleWidth} />
      {showStats && <StatCardsSkeleton count={4} />}
      <TableSkeleton columns={columns} rows={rows} />
    </div>
  );
}
