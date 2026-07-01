# IFP-TASK-020: Multi-Select + Bulk Action Bar

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-01-DataTable-Engine |
| ID | IFP-TASK-020 |
| Priority | P0 |
| Depends on | IFP-TASK-019 |
| Blocks | IFP Phase 03+ bulk operations (customer tag, export selected) |
| Estimated | 10h |

---

## هدف

الگوی **انتخاب چندتایی** در DataTable — checkbox per row + select-all در صفحه فعلی — و **BulkActionBar** شناور/sticky که وقتی ≥۱ ردیف انتخاب شده ظاهر می‌شود. عملیات گروهی permission-gated هستند؛ DataTable فقط UI و callback ارائه می‌دهد.

---

## معیار پذیرش

- [ ] Row checkbox column — optional via `enableRowSelection`
- [ ] Header checkbox: select all **loaded rows on current pages** (not entire dataset)
- [ ] Indeterminate state وقتی برخی انتخاب شده
- [ ] `BulkActionBar` — sticky bottom یا top زیر toolbar
- [ ] نمایش «{n} مورد انتخاب شده» + دکمه «لغو انتخاب»
- [ ] Actions slot: `bulkActions: BulkAction[]` با `permission`, `label`, `icon`, `variant`, `onExecute`
- [ ] Confirm dialog برای destructive bulk actions
- [ ] Selection state در URL sync **نه** — local state + clear on filter change
- [ ] `getRowId(row) => row.id` — required
- [ ] Disabled checkbox برای rows با `selectable: false` (e.g. owner staff)
- [ ] Keyboard: Shift+click range select (desktop)
- [ ] a11y: `aria-selected` on rows

---

## مشخصات فنی

### Types

```typescript
// packages/contracts/src/ui/bulk-actions.schema.ts
export interface BulkAction<T = unknown> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  permission?: string; // hide if !hasPermission
  requiresConfirm?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  onExecute: (selectedRows: T[]) => Promise<void>;
}

export interface RowSelectionState {
  [rowId: string]: boolean;
}
```

### DataTable Extension

```typescript
interface DataTableSelectionProps<T> {
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  isRowSelectable?: (row: T) => boolean;
  bulkActions?: BulkAction<T>[];
}
```

### BulkActionBar Component

```
apps/web/src/components/data-table/bulk-action-bar.tsx
```

```tsx
<BulkActionBar
  selectedCount={selectedCount}
  onClearSelection={() => setRowSelection({})}
  actions={visibleActions} // filtered by permission
/>
```

Layout (sticky bottom mobile):

```
┌─────────────────────────────────────────────┐
│ ۳ مورد انتخاب شده    [لغو] [برچسب] [حذف] │
└─────────────────────────────────────────────┘
```

### Select All Behavior

| حالت | رفتار |
|------|--------|
| Click header checkbox | toggle all **currently loaded** rows where `isRowSelectable` |
| Load more pages | selection حفظ — IDs در state |
| Filter/search change | **clear selection** + toast «انتخاب‌ها پاک شد» |
| Sort change | selection حفظ |

### Permission Gate

```typescript
const visibleActions = bulkActions.filter(
  (a) => !a.permission || hasPermission(a.permission)
);
```

### Bulk Execute Pattern (consumer)

```typescript
{
  id: 'bulk-tag',
  label: 'افزودن برچسب',
  permission: 'installments.customer.update',
  onExecute: async (rows) => {
    await api.customers.bulkTag({ ids: rows.map(r => r.id), tagId });
    toast.success(`${rows.length} مشتری به‌روز شد`);
    clearSelection();
    refetch();
  },
}
```

Backend bulk endpoints در فازهای دامنه — این task فقط UI contract.

### Confirm Dialog

Destructive actions (`variant: 'destructive'` یا `requiresConfirm: true`):

```
Title: «حذف {n} مورد؟»
Description: «این عمل قابل بازگشت است (soft delete).»
Actions: [انصراف] [تأیید]
Loading on confirm
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/components/data-table/bulk-action-bar.tsx` |
| Create | `apps/web/src/components/data-table/data-table-selection-column.tsx` |
| Create | `packages/contracts/src/ui/bulk-actions.schema.ts` |
| Update | `apps/web/src/components/data-table/data-table.tsx` — selection props |
| Update | `apps/web/src/hooks/use-data-table-query.ts` — clear selection on filter change |
| Create | `apps/web/src/components/data-table/bulk-confirm-dialog.tsx` |

---

## مراحل پیاده‌سازی

1. Selection column component + header checkbox
2. RowSelection state management in DataTable
3. BulkActionBar UI
4. Permission filter on actions
5. Confirm dialog for destructive
6. Clear on filter change hook
7. Shift+click range select
8. Demo on customer list — bulk export selected (stub until IFP-TASK-025)
9. a11y attributes

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار UI |
|--------|-------------|----------|
| Bulk API partial fail | 207 multi-status | Toast «{ok} موفق، {fail} ناموفق» + detail modal |
| Bulk API all fail | 4xx | Toast error + keep selection |
| Row not selectable | — | Checkbox disabled + tooltip |
| 0 permission for actions | — | Bar shows count only + «عملیات مجاز نیست» |
| Select all then load more | — | New rows not auto-selected |
| Execute during loading | — | Disable bar buttons |

---

## تست

- [ ] Unit: select all toggles loaded rows only
- [ ] Unit: indeterminate header state
- [ ] Component: bulk bar hidden when count=0
- [ ] Component: destructive opens confirm
- [ ] Component: permission hides action button
- [ ] Integration: filter change clears selection

---

## UX

- [ ] Bulk bar does not cover pagination
- [ ] Mobile: full-width bar، scroll actions horizontally
- [ ] Selected row background tint
- [ ] Toast on successful bulk complete
- [ ] Excellence §6.4 bulk actions ✅

---

## Flow

```
User checks rows → BulkActionBar appears
  ├─ Click action (non-destructive) → onExecute → loading → toast → clear
  ├─ Click destructive → confirm dialog → execute
  └─ Clear / change filter → selection reset
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §6.4 — bulk actions
- [ ] ADR-004 — permission per bulk action
- [ ] SOFT-DELETE-POLICY — bulk delete = soft delete use cases (domain phases)

---

## مراجع

- `docs/02-architecture/rbac.md`
- `IFP-TASK-019-datatable-core-component.md`
- `docs/01-product/installment-module-features.md` — انتخاب چندتایی، عملیات گروهی

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | |
| Policy | /25 | 24 | RBAC + soft delete note |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 ✅ |
