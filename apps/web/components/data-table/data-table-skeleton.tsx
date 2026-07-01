'use client';

type DataTableSkeletonProps = {
  columnCount: number;
  rowCount?: number;
  'aria-label'?: string;
};

export function DataTableSkeleton({
  columnCount,
  rowCount = 5,
  'aria-label': ariaLabel = 'در حال بارگذاری جدول',
}: DataTableSkeletonProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {Array.from({ length: columnCount }).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/60 last:border-0">
                {Array.from({ length: columnCount }).map((__, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-muted/40" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
