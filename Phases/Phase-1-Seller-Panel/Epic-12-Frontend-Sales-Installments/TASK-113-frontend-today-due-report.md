# TASK-113: Frontend — Today Due Report

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-12-Frontend-Sales-Installments |
| ID | TASK-113 |
| Priority | P0 |
| Depends on | TASK-105, TASK-090 |
| Blocks | — |
| Estimated | 6h |

---

## هدف

صفحه گزارش اقساط سررسید امروز — لیست کامل (نه فقط top 10 داشبورد) با فیلتر شعبه و pagination — مطابق REPORTS.md §1.2.

---

## معیار پذیرش

- [ ] Route `/admin/reports/today-due`
- [ ] Permission: `installments.report.dashboard`
- [ ] لیست installments با `due_date = today` و status `pending|overdue`
- [ ] Filters: branch (default active), customer search
- [ ] Columns: مشتری، فروش، قسط، مبلغ، وضعیت، سررسید
- [ ] Row action: مشاهده فروش
- [ ] Summary header: count + total amount today
- [ ] Cursor pagination
- [ ] Page states complete

---

## مشخصات فنی

### Route

```
apps/web/app/(seller)/admin/reports/today-due/page.tsx
```

### Permission

`installments.report.dashboard`

### API Endpoints

```
GET /api/v1/reports/today-due?branchId=&search=&cursor=&limit=20&sort=dueDate:asc

// Alternative if TASK-090 uses installments endpoint:
GET /api/v1/installments?status=pending,overdue&dueDate=today&branchId=&cursor=
```

### Response Row

```typescript
{
  id: string;
  saleId: string;
  saleTitle: string;
  sequenceNumber: number;
  totalInstallments: number;
  customer: { id: string; name: string; phone: string };
  amountRial: string;
  dueDate: string;
  status: 'pending' | 'overdue';
  branchId: string;
  branchName: string;
}
```

### Summary Bar

```
امروز — ۱۴۰۵/۰۴/۰۸
۱۲ قسط سررسید — مجموع: ۲۴,۰۰۰,۰۰۰ تومان
```

### Wireframe

```
Breadcrumb: خانه > گزارش‌ها > سررسید امروز

سررسید امروز
─────────────────────────────────────────
۱۲ قسط — مجموع ۲۴,۰۰۰,۰۰۰ تومان

┌─────────────────────────────────────────┐
│ شعبه [▼]     مشتری [🔍 جستجو...]  [پاک] │
└─────────────────────────────────────────┘

┌──────────┬────────────┬─────────┬──────────┬────────┬────────┐
│ مشتری    │ فروش       │ قسط     │ مبلغ     │ وضعیت  │ عمل    │
├──────────┼────────────┼─────────┼──────────┼────────┼────────┤
│ حسین     │ گوشی S23   │ ۳ از ۱۰ │ ۲M تومان │ معوق 🔴│ [→]    │
│ مریم     │ یخچال      │ ۱ از ۶  │ ۱.۵M     │ انتظار │ [→]    │
└──────────┴────────────┴─────────┴──────────┴────────┴────────┘

[بارگذاری بیشتر]
```

### Empty State

```
امروز قسطی سررسید ندارید 🎉
می‌توانید فروش جدید ثبت کنید.
[＋ فروش جدید]
```

### Link from Dashboard

TASK-105 table footer: «مشاهده همه» → this page with same branch filter.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/reports/today-due/page.tsx` |
| Create | `apps/web/components/reports/today-due-summary.tsx` |
| Create | `apps/web/components/reports/today-due-table.tsx` |
| Create | `apps/web/components/reports/today-due-filters.tsx` |
| Create | `apps/web/hooks/use-today-due-report.ts` |

---

## مراحل پیاده‌سازی

1. Summary from first page meta or dedicated count endpoint
2. Reuse installment status badges from TASK-111
3. Filters sync with URL
4. Infinite cursor load
5. Link to `/admin/sales/[saleId]`
6. Empty state with quick action

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Timezone Tehran midnight boundary | trust API date = today |
| overdue shown today | red badge — still in today-due list |
| Branch switch | refetch |
| 403 | NoPermissionPage |

---

## تست

- [ ] E2E: today-due list matches dashboard count
- [ ] E2E: empty state when no dues
- [ ] Unit: summary total sum from page data

---

## UX

- [x] Page §7 complete
- [x] Consistent with dashboard today-due table
- [x] RTL + Toman amounts

---

## Policy Alignment

- [x] REPORTS.md §1.2 query semantics
- [x] ADR-015 branch filter
- [x] SF-010 reports access

---

## مراجع

- `docs/03-modules/installments/REPORTS.md` — §1.2
- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-010
- `Phases/Phase-1-Seller-Panel/Epic-11-Frontend-Customer-Pages/TASK-105-frontend-dashboard-page.md`

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
