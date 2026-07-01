# TASK-112: Frontend — Overdue Report

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-12-Frontend-Sales-Installments |
| ID | TASK-112 |
| Priority | P0 |
| Depends on | TASK-104, TASK-091 |
| Blocks | — |
| Estimated | 8h |

---

## هدف

گزارش معوقات مطابق REPORTS.md §2: لیست مشتریان با اقساط overdue، فیلترها، مرتب‌سازی، cursor pagination — دکمه Export Excel **disabled P1** (مستندسازی آینده).

---

## معیار پذیرش

- [ ] Route `/admin/reports/overdue`
- [ ] Permission: `installments.report.overdue`
- [ ] Filters: branch, overdue days range, customer search, min amount
- [ ] Sort: amount desc (default), days desc, name asc
- [ ] Columns per REPORTS.md §2
- [ ] Export button visible but **disabled** with tooltip «به‌زودی» (P1 — needs `installments.report.export`)
- [ ] Row click → customer edit or sale list filtered
- [ ] Page states complete

---

## مشخصات فنی

### Route

```
apps/web/app/(seller)/admin/reports/overdue/page.tsx
```

### Permission

`installments.report.overdue`

### API Endpoints

```
GET /api/v1/reports/overdue?branchId=&overdueDaysMin=&overdueDaysMax=&search=&minAmountRial=&sort=totalOverdueRial:desc&cursor=&limit=20
```

### Response Row Shape

```typescript
{
  customerId: string;
  displayName: string;
  phone: string;
  overdueCount: number;
  totalOverdueRial: string;
  oldestDueDate: string;
  lastPaymentAt: string | null;
  botLinked: boolean;
}
```

### Columns

| Column (fa) | Field | Format |
|-------------|-------|--------|
| مشتری | displayName + phone | phone masked |
| تعداد معوق | overdueCount | فارسی |
| مجموع معوق | totalOverdueRial | formatToman |
| قدیمی‌ترین سررسید | oldestDueDate | Jalali |
| آخرین پرداخت | lastPaymentAt | Jalali or «—» |
| ربات | botLinked | متصل / متصل نیست |

### Filter Defaults

| Filter | Default |
|--------|---------|
| branchId | active branch |
| overdueDaysMin | — |
| overdueDaysMax | — |
| search | empty |
| minAmountRial | — |
| sort | `totalOverdueRial:desc` |

### Wireframe

```
Breadcrumb: خانه > گزارش‌ها > معوقات

گزارش معوقات                    [خروجی Excel 🔒 به‌زودی]

┌────────────────────────────────────────────────────────────┐
│ شعبه [▼]  روز معوق [از]-[تا]  مشتری [🔍]  حداقل مبلغ [ ] │
│ مرتب‌سازی: [مجموع معوق ▼]                    [پاک فیلتر] │
└────────────────────────────────────────────────────────────┘

┌──────────┬───────┬──────────┬────────────┬──────────┬──────┐
│ مشتری    │ تعداد │ مجموع    │ قدیمی‌ترین │ آخرین    │ ربات │
├──────────┼───────┼──────────┼────────────┼──────────┼──────┤
│ علی...   │ ۲     │ ۳M تومان │ ۱۴۰۵/۰۲/۰۱ │ ۱۴۰۵/۰۳│ ✅   │
└──────────┴───────┴──────────┴────────────┴──────────┴──────┘

[بارگذاری بیشتر]
```

### Export Button (P1 — Future)

```tsx
<Button disabled title="خروجی Excel در نسخه بعدی فعال می‌شود">
  خروجی Excel
</Button>
// Future: permission installments.report.export
// Future: GET /api/v1/reports/overdue/export?...
```

### Empty State

```
🎉 معوقاتی ثبت نشده است
همه مشتریان به‌موقع پرداخت کرده‌اند.
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/reports/overdue/page.tsx` |
| Create | `apps/web/components/reports/overdue-filters.tsx` |
| Create | `apps/web/components/reports/overdue-table.tsx` |
| Create | `apps/web/hooks/use-overdue-report.ts` |

---

## مراحل پیاده‌سازی

1. Report layout under `/reports`
2. Filters + URL sync
3. Cursor pagination table
4. Disabled export with tooltip
5. Bot linked badge
6. Link customer name to edit page

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Cashier branch scope | API scoped |
| min amount filter | TomanInput → Rial query param |
| Empty results | empty state |
| 403 | NoPermissionPage |

---

## تست

- [ ] E2E: overdue report with seed overdue data
- [ ] E2E: export button disabled
- [ ] Unit: sort param building

---

## UX

- [x] Page §7 + List §6.4
- [x] Export documented as P1 future
- [x] Min amount TomanInput

---

## Policy Alignment

- [x] REPORTS.md §2
- [x] `installments.report.export` — Phase 5+
- [x] PII phone mask for viewer role (API)

---

## مراجع

- `docs/03-modules/installments/REPORTS.md` — §2, §6 Export
- `docs/02-architecture/rbac.md` — report permissions

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
