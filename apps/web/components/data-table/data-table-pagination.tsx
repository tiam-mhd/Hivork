'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button, cn } from '@hivork/ui';
import { useEffect, useRef } from 'react';

type DataTablePaginationProps = {
  loadedCount: number;
  totalCount?: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  enableInfiniteScroll?: boolean;
};

export function DataTablePagination({
  loadedCount,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  enableInfiniteScroll = true,
}: DataTablePaginationProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enableInfiniteScroll || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPage();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enableInfiniteScroll, fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (!hasNextPage && loadedCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          نمایش {formatPersianDigits(loadedCount)}
          {totalCount !== undefined ? ` از ${formatPersianDigits(totalCount)}` : ''}
        </p>
        {hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
          </Button>
        ) : null}
      </div>

      {hasNextPage ? (
        <>
          <div ref={sentinelRef} className={cn('h-1', enableInfiniteScroll ? 'hidden md:block' : 'hidden')} />
          <div className="hidden justify-center md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
