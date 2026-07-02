import type { DataTableSortDir, RowSelectionState } from '@hivork/contracts/ui';
import type { ReactNode } from 'react';

import type { BulkAction } from './bulk-action-bar';

export type DataTableColumnDef<T> = {
  id: string;
  header: string;
  accessorKey?: keyof T & string;
  cell?: (ctx: { row: T }) => ReactNode;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  width?: string | number;
  hideOnMobile?: boolean;
  meta?: { moneyRial?: boolean };
  /** When false, column stays visible and cannot be toggled off (e.g. actions). Default true. */
  enableHiding?: boolean;
  /** Initial hidden state before user personalization. */
  defaultHidden?: boolean;
};

export type DataTableProps<T extends { id: string }> = {
  columns: DataTableColumnDef<T>[];
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry?: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  sortBy?: string;
  sortDir?: DataTableSortDir;
  onSortChange?: (sortBy: string | undefined, sortDir: DataTableSortDir | undefined) => void;
  sortWhitelist: readonly string[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  toolbar?: ReactNode;
  renderMobileCard?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  skeletonRowCount?: number;
  totalCount?: number;
  loadedCount?: number;
  enableInfiniteScroll?: boolean;
  'aria-label': string;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  getRowId?: (row: T) => string;
  isRowSelectable?: (row: T) => boolean;
  rowNotSelectableReason?: string;
  bulkActions?: BulkAction<T>[];
  /** Enables `/` and export shortcuts for list pages. */
  enableListShortcuts?: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  onListExport?: () => void;
  canListExport?: boolean;
};
