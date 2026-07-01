# TASK-109: Frontend — Sale List

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-12-Frontend-Sales-Installments |
| ID | TASK-109 |
| Priority | P0 |
| Depends on | TASK-104, TASK-087 |
| Blocks | TASK-110, TASK-111 |
| Estimated | 8h |

---

## هدف

صفحه لیست فروش‌ها با فیلتر وضعیت، مشتری، بازه تاریخ، شعبه — status badges و cursor pagination — مطابق SF-003.

---

## معیار پذیرش

- [ ] Route `/admin/sales`
- [ ] Permission: `installments.sale.view`
- [ ] Filters: status (multi), customer search, date range (Jalali), branch
- [ ] Default filters: status=all, date=last 30 days, branch=active
- [ ] Columns: کد/عنوان، مشتری، مبلغ کل، اقساط، وضعیت، تاریخ، شعبه
- [ ] Status badges: active 🟢, completed ✅, cancelled ⚫
- [ ] Row click → `/admin/sales/[id]`
- [ ] Primary action: فروش جدید (`installments.sale.create`)
- [ ] Page states complete

---

## مشخصات فنی

### Route

```
apps/web/app/(seller)/admin/sales/page.tsx
```

### Permission

| Action | Permission |
|--------|------------|
| View list | `installments.sale.view` |
| Create button | `installments.sale.create` |

### API Endpoints

```
GET /api/v1/sales?status=active,completed&customerSearch=&branchId=&from=&to=&cursor=&limit=20&sort=createdAt:desc
```

### Status Badges

| Status | Label (fa) | Color token |
|--------|------------|-------------|
| active | فعال | green |
| completed | تکمیل‌شده | blue |
| cancelled | لغو‌شده | gray |

### Wireframe

```
Breadcrumb: خانه > فروش‌ها

فروش‌ها                              [＋ فروش جدید]

┌──────────────────────────────────────────────────────────┐
│ وضعیت [▼]  مشتری [🔍]  از [📅] تا [📅]  شعبه [▼]  [پاک] │
└──────────────────────────────────────────────────────────┘

┌────────┬──────────┬──────────┬──────┬────────┬──────────┐
│ عنوان  │ مشتری    │ مبلغ     │ اقساط│ وضعیت  │ تاریخ    │
├────────┼──────────┼──────────┼──────┼────────┼──────────┤
│ گوشی.. │ حسین     │ ۶M تومان │ ۴/۴  │ فعال 🟢│ ۱۴۰۵/۰۱│
└────────┴──────────┴──────────┴──────┴────────┴──────────┘

[بارگذاری بیشتر]
```

### Filter Defaults

| Filter | Default |
|--------|---------|
| status | all (no filter) |
| from/to | 30 days ago → today (Jalali) |
| branchId | active branch from session |
| customerSearch | empty |
| limit | 20 |

### Empty State

```
هنوز فروشی ثبت نشده است.
با ثبت اولین فروش، اقساط به‌صورت خودکار ایجاد می‌شوند.
[＋ فروش جدید]
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/sales/page.tsx` |
| Create | `apps/web/components/sales/sale-list-filters.tsx` |
| Create | `apps/web/components/sales/sale-table.tsx` |
| Create | `apps/web/components/sales/sale-status-badge.tsx` |
| Create | `apps/web/hooks/use-sales-list.ts` |

---

## مراحل پیاده‌سازی

1. Filter bar با URL sync
2. Infinite cursor query
3. formatToman for amounts
4. Progress column: paidCount/totalCount
5. Branch filter from accessible branches
6. Jalali date range picker

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Branch cashier scope | API filters — UI shows only allowed branches |
| No sales in filter | empty with clear filters CTA |
| 403 | NoPermissionPage |

---

## تست

- [ ] E2E: list after create sale
- [ ] E2E: status filter works
- [ ] Unit: badge variant per status

---

## UX

- [x] Page §7 full
- [x] Money in Toman display
- [x] RTL table

---

## Policy Alignment

- [x] SF-003 filters
- [x] ADR-015 branch scope
- [x] Cursor pagination

---

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-003
- `docs/03-modules/installments/state-machines.md` — Sale status

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 25 |
| Executability | /25 | 25 |
| Alignment | /15 | 15 |
| **جمع** | **/100** | **100** |
