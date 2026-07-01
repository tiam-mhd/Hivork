# IFP-TASK-021: Column Personalization + Drag-Drop Reorder

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-01-DataTable-Engine |
| ID | IFP-TASK-021 |
| Priority | P0 |
| Depends on | IFP-TASK-019 |
| Blocks | IFP-TASK-027 |
| Estimated | 12h |

---

## هدف

شخصی‌سازی **ستون‌های جدول** — نمایش/مخفی، ترتیب با drag-drop، عرض تقریبی — با persist موقت در `localStorage` و آماده‌سازی برای `StaffSavedView` (IFP-TASK-027). منوی «ستون‌ها» در toolbar هر DataTable.

---

## معیار پذیرش

- [ ] `ColumnSettingsDropdown` — checklist visible columns + reset to default
- [ ] Drag-drop reorder در dropdown یا side panel (`@dnd-kit/core`)
- [ ] حداقل ۱ ستون همیشه visible — disable hide on last column
- [ ] Columns marked `enableHiding: false` (e.g. actions) — locked visible
- [ ] State: `ColumnVisibilityState`, `ColumnOrderState`
- [ ] `useColumnPersonalization(resourceKey, defaultColumns)` hook
- [ ] Persist key: `hivork:columns:{resourceKey}:{staffId}` in localStorage
- [ ] `onColumnStateChange` callback برای sync به saved view
- [ ] RTL: drag handle on correct side
- [ ] Mobile: column settings در drawer
- [ ] Reset «بازنشانی به پیش‌فرض»

---

## مشخصات فنی

### Column State Schema

```typescript
// packages/contracts/src/ui/column-personalization.schema.ts
export const ColumnPersonalizationSchema = z.object({
  order: z.array(z.string()).min(1),
  visibility: z.record(z.string(), z.boolean()),
  widths: z.record(z.string(), z.number().int().min(50).max(600)).optional(),
});

export type ColumnPersonalization = z.infer<typeof ColumnPersonalizationSchema>;
```

### Extended Column Def

```typescript
interface DataTableColumnDef<T> {
  // ... IFP-TASK-019 fields
  enableHiding?: boolean; // default true
  defaultHidden?: boolean;
}
```

### useColumnPersonalization Hook

```typescript
export function useColumnPersonalization(
  resourceKey: string,
  defaultColumns: DataTableColumnDef<unknown>[],
) {
  const staffId = useStaffId();
  const storageKey = `hivork:columns:${resourceKey}:${staffId}`;

  // load merge: saved overrides defaults
  // apply order to visible columns array passed to DataTable
  return {
    columns,           // ordered + filtered
    columnState,
    setColumnState,
    resetToDefault,
    openSettings,      // trigger dropdown
  };
}
```

### ColumnSettingsDropdown UI

```
┌─ تنظیم ستون‌ها ─────────────┐
│ ≡ نام مشتری          [✓]    │
│ ≡ شماره تماس         [✓]    │
│ ≡ مانده بدهی         [ ]    │
│ ≡ تاریخ ثبت          [✓]    │
├─────────────────────────────┤
│ [بازنشانی پیش‌فرض]          │
└─────────────────────────────┘
```

Drag handle `≡` — `@dnd-kit/sortable`

### Integration with DataTable

```tsx
const { columns, columnSettingsTrigger } = useColumnPersonalization('customers', defaultCols);

<DataTable
  columns={columns}
  toolbar={<>{filterBar}{columnSettingsTrigger}{exportBtn}</>}
  onColumnStateChange={setColumnState} // for view save
/>
```

### Width Resize (optional P1 in same task)

- Column border drag resize — `colWidths` in state
- Min width 80px

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/components/data-table/column-settings-dropdown.tsx` |
| Create | `apps/web/src/components/data-table/column-settings-drawer.tsx` |
| Create | `apps/web/src/hooks/use-column-personalization.ts` |
| Create | `packages/contracts/src/ui/column-personalization.schema.ts` |
| Update | `apps/web/src/components/data-table/data-table.tsx` — apply order/visibility |
| Update | `packages/contracts/src/ui/data-table.schema.ts` — enableHiding |

---

## مراحل پیاده‌سازی

1. Zod schema + types
2. Hook: load/save localStorage
3. Column filter + order logic
4. Settings dropdown with checkboxes
5. dnd-kit sortable list
6. Mobile drawer variant
7. Reset to default
8. Wire to customer list POC
9. Export `columnState` for IFP-TASK-027

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Corrupt localStorage JSON | Ignore + use defaults + log dev warning |
| Saved column id no longer exists | Skip unknown ids |
| All columns hidden attempt | Block — keep last visible |
| New column added in app update | Append to end, visible per defaultHidden |
| Staff switch (logout/login) | Different storage key per staffId |
| Private browsing / no localStorage | In-memory only per session |

---

## تست

- [ ] Unit: merge saved state with defaults
- [ ] Unit: cannot hide last visible column
- [ ] Component: drag reorder updates order array
- [ ] Component: reset restores defaults
- [ ] Integration: refresh page preserves column state

---

## UX

- [ ] Dropdown/drawer: label fa، keyboard navigable
- [ ] Drag: visual placeholder while dragging
- [ ] Tooltip on locked columns «این ستون قابل مخفی‌سازی نیست»
- [ ] Excellence §6.4 — column personalization ✅

---

## Flow

```
User opens «ستون‌ها» → toggle visibility / drag reorder
  → state updates → table re-renders
  → auto-save localStorage
  → (later) IFP-TASK-027 saves to StaffSavedView
Reset → defaults → clear localStorage key
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §6.4 — شخصی‌سازی ستون‌ها
- [ ] No PII in localStorage keys — only column ids

---

## مراجع

- `IFP-TASK-019-datatable-core-component.md`
- `IFP-TASK-027-saved-views-crud-api.md`
- `docs/01-product/installment-module-features.md` — شخصی‌سازی ستون‌ها، Drag & Drop

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | |
| Policy | /25 | 23 | |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | Links to 027 |
| **جمع** | **/100** | **98** | ≥95 ✅ |
