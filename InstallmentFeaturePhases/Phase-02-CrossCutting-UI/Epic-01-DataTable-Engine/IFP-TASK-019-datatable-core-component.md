# IFP-TASK-019: DataTable Core Component

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-01-DataTable-Engine |
| ID | IFP-TASK-019 |
| Priority | P0 |
| Depends on | TASK-101, TASK-102, TASK-103, IFP-TASK-018 |
| Blocks | IFP-TASK-020, IFP-TASK-021, IFP-TASK-022, IFP-TASK-023, IFP-TASK-027, IFP-TASK-032 |
| Estimated | 16h |

---

## هدف

کامپوننت **DataTable** جنریک و type-safe برای تمام لیست‌های admin — با cursor pagination، sort روی فیلدهای whitelist، و states کامل (loading، empty، error، no-permission). این task پایه Epic-01 و تمام فازهای Enterprise UI بعدی است؛ بدون آن هر صفحه جدول جداگانه می‌سازد.

---

## معیار پذیرش

- [ ] `DataTable<T>` در `packages/ui` یا `apps/web/src/components/data-table/` — reusable
- [ ] Cursor pagination: `cursor` + `limit` + `hasNext` — **بدون** offset
- [ ] Sort: کلیک header → `sortBy` + `sortDir` — فقط فیلدهای `sortable: true` در column def
- [ ] Column definitions: `id`, `header`, `accessor`, `cell`, `sortable`, `align`, `width`, `hideOnMobile`
- [ ] Toolbar slots: `filters`, `actions`, `export` (placeholder برای epicهای بعد)
- [ ] Row click optional → `onRowClick(row)`
- [ ] Sticky header + horizontal scroll on overflow
- [ ] Mobile: optional card view via `renderMobileCard(row)`
- [ ] Loading skeleton (rows configurable)
- [ ] Empty state با `emptyTitle`, `emptyDescription`, `emptyAction`
- [ ] Error state با retry callback
- [ ] Integration با TanStack Query — `useDataTableQuery` hook
- [ ] RTL: header alignment، sort icon mirror
- [ ] Storybook یا demo page `/admin/dev/data-table` (dev only)

---

## مشخصات فنی

### Generic API

```typescript
// packages/contracts/src/ui/data-table.schema.ts
export const DataTableSortDirSchema = z.enum(['asc', 'desc']);
export const DataTableQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: DataTableSortDirSchema.optional(),
});
export type DataTableQuery = z.infer<typeof DataTableQuerySchema>;

export interface DataTableColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T & string;
  cell?: (ctx: { row: T }) => React.ReactNode;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  width?: string | number;
  hideOnMobile?: boolean;
  meta?: { moneyRial?: boolean }; // ADR-007
}
```

### Component Props

```typescript
interface DataTableProps<T extends { id: string }> {
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
  sortDir?: 'asc' | 'desc';
  onSortChange?: (sortBy: string | undefined, sortDir: 'asc' | 'desc' | undefined) => void;
  sortWhitelist: string[]; // enforced client + documented for API
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  renderMobileCard?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  'aria-label': string;
}
```

### Sort Whitelist Enforcement

```typescript
function handleSort(columnId: string) {
  if (!sortWhitelist.includes(columnId)) return;
  // toggle asc → desc → clear
}
```

Backend **must** reject `sortBy` not in whitelist → `400 SORT_FIELD_INVALID`.

### Cursor Pagination UI

- دکمه «بارگذاری بیشتر» در پایین جدول (mobile-first)
- Desktop: infinite scroll optional via IntersectionObserver
- نمایش «نمایش {loaded} از {total?}» اگر API `totalCount` برگرداند

### useDataTableQuery Hook

```typescript
// apps/web/src/hooks/use-data-table-query.ts
export function useDataTableQuery<T>({
  queryKey,
  fetchFn,
  defaultSort,
  defaultLimit = 20,
}: UseDataTableQueryOptions<T>) {
  // merges sortBy, sortDir, cursor into queryKey
  // useInfiniteQuery with getNextPageParam: lastPage.nextCursor
}
```

### List API Response Contract (shared)

```typescript
export const PaginatedListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().uuid().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().int().optional(),
  });
```

### File Structure

```
apps/web/src/components/data-table/
├── data-table.tsx           # main table
├── data-table-header.tsx    # sortable headers
├── data-table-body.tsx
├── data-table-skeleton.tsx
├── data-table-empty.tsx
├── data-table-error.tsx
├── data-table-pagination.tsx
└── index.ts
apps/web/src/hooks/use-data-table-query.ts
packages/contracts/src/ui/data-table.schema.ts
packages/contracts/src/ui/paginated-list.schema.ts
```

### Demo Integration

Migrate `GET /api/v1/customers` list در صفحه مشتریان Phase 1 به DataTable (proof of concept):

```http
GET /api/v1/customers?limit=20&cursor=&sortBy=createdAt&sortDir=desc
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/components/data-table/data-table.tsx` |
| Create | `apps/web/src/components/data-table/data-table-header.tsx` |
| Create | `apps/web/src/components/data-table/data-table-skeleton.tsx` |
| Create | `apps/web/src/components/data-table/data-table-empty.tsx` |
| Create | `apps/web/src/components/data-table/data-table-error.tsx` |
| Create | `apps/web/src/components/data-table/data-table-pagination.tsx` |
| Create | `apps/web/src/components/data-table/index.ts` |
| Create | `apps/web/src/hooks/use-data-table-query.ts` |
| Create | `packages/contracts/src/ui/data-table.schema.ts` |
| Create | `packages/contracts/src/ui/paginated-list.schema.ts` |
| Update | `packages/contracts/src/index.ts` — export ui schemas |
| Update | `apps/web/src/features/customers/customer-list.tsx` — adopt DataTable (POC) |

---

## مراحل پیاده‌سازی

1. Contracts: `DataTableQuerySchema`, `PaginatedListResponseSchema`
2. `DataTable` shell — table markup با shadcn `Table`
3. Sortable headers با whitelist guard
4. Skeleton, empty, error components
5. `useDataTableQuery` با `useInfiniteQuery`
6. Pagination footer — load more + hasNext
7. Mobile card view prop
8. RTL polish — icons, alignment
9. POC: customer list migration
10. Dev demo page (feature flag `DEV_TOOLS`)

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار UI |
|--------|-------------|----------|
| Invalid sortBy from URL | 400 `SORT_FIELD_INVALID` | Reset to default sort + toast |
| Empty result | 200 `items: []` | Empty state با CTA |
| Network error | — | Error panel + retry |
| cursor expired / invalid | 400 `CURSOR_INVALID` | Reset to first page |
| limit > max | 400 `LIMIT_EXCEEDED` | Clamp to 100 client-side |
| No permission | 403 | No-permission state (page level) |
| Partial page load fail | — | Show loaded rows + inline error banner |

---

## تست

- [ ] Unit: sort toggle cycle asc→desc→clear
- [ ] Unit: sort rejected when not in whitelist
- [ ] Component: skeleton renders N rows
- [ ] Component: empty state shows CTA
- [ ] Component: error state calls onRetry
- [ ] Integration: customer list loads first page + load more
- [ ] a11y: table has `aria-label`, sort buttons `aria-sort`

---

## UX

### Page integration — Excellence §7

- [ ] Breadcrumb + title outside DataTable (page owns)
- [ ] Toolbar slot above table
- [ ] Loading skeleton matches column count
- [ ] Empty: «موردی یافت نشد» + action مرتبط
- [ ] Error: «خطا در بارگذاری» + «تلاش مجدد»
- [ ] Responsive: card view < md breakpoint
- [ ] Sticky header on scroll

### Table — Excellence §6.4

- [ ] Column sort visual indicator
- [ ] Row hover state
- [ ] Money columns LTR in RTL page
- [ ] Long text truncate + tooltip

---

## Flow

```
Entry: Page mounts with default sort
  ↓ useDataTableQuery → GET list (cursor=null)
  ↓ DataTable renders rows OR skeleton
  ├─ User clicks sort header → update queryKey → refetch page 1
  ├─ User scrolls / clicks «بیشتر» → fetchNextPage(cursor)
  ├─ Error → retry → refetch
  └─ Empty → CTA (e.g. «مشتری جدید»)
Exit: row click → detail (optional)
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3.2 List API، §6.4 جداول، §7 page states
- [ ] ADR-007 — money display via `formatMoney` helper in cell renderer
- [ ] ADR-016 — query params on `/api/v1/`
- [ ] DEVELOPMENT_RULES §6 — TanStack Query، no fetch in components

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §3.2, §6.4, §7
- `docs/09-development/DEVELOPMENT_RULES.md` §6
- `docs/02-architecture/data-flow.md` — cursor pagination example
- `Phases/Phase-1-Seller-Panel/Epic-13-Frontend-Admin-Settings/TASK-116-frontend-staff-management.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | Full API, hook, POC |
| Policy | /25 | 24 | ADR-007, Excellence cited |
| Executability | /25 | 25 | Edge cases, file paths |
| Alignment | /15 | 15 | Sync list API pattern |
| **جمع** | **/100** | **99** | ≥95 ✅ |
