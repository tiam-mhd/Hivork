# TASK-106: Frontend — Customer List

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-11-Frontend-Customer-Pages |
| ID | TASK-106 |
| Priority | P0 |
| Depends on | TASK-104, TASK-084 |
| Blocks | TASK-107, TASK-108 |
| Estimated | 8h |

---

## هدف

صفحه لیست مشتریان tenant با جستجو، فیلتر برچسب، pagination مبتنی بر cursor، و row actions — مطابق SF-007.

---

## معیار پذیرش

- [ ] Route `/admin/customers`
- [ ] Permission view: `installments.customer.view`
- [ ] Filters: search (name/phone), tag multi-select — defaults: همه
- [ ] Cursor pagination: «بارگذاری بیشتر» یا next/prev
- [ ] Columns: نام، شماره (masked)، کد محلی، برچسب‌ها، معوقات، آخرین خرید
- [ ] Primary actions: مشتری جدید، ورود Excel (permission gated)
- [ ] Row actions: مشاهده، ویرایش
- [ ] States: skeleton, empty+CTA, error, no-permission

---

## مشخصات فنی

### Route

```
apps/web/app/(seller)/admin/customers/page.tsx
```

### Permission

| Action | Permission |
|--------|------------|
| View page | `installments.customer.view` |
| Create button | `installments.customer.create` |
| Import button | `installments.customer.import` |
| Edit row | `installments.customer.update` |

### API Endpoints

```
GET /api/v1/customers?search=&tags=vip,regular&cursor=&limit=20&sort=createdAt:desc
```

### Wireframe

```
Breadcrumb: خانه > مشتریان

مشتریان                    [ورود Excel] [＋ مشتری جدید]

┌─────────────────────────────────────────────────────────┐
│ 🔍 جستجو نام یا شماره...    [برچسب ▼]  [پاک کردن فیلتر] │
└─────────────────────────────────────────────────────────┘

┌────────┬────────────┬────────┬─────────┬──────────┬──────┐
│ نام    │ شماره      │ کد     │ برچسب   │ معوقات   │ ⋮    │
├────────┼────────────┼────────┼─────────┼──────────┼──────┤
│ حسین   │ 0912***67  │ C-001  │ vip     │ ۱        │ ⋮    │
└────────┴────────────┴────────┴─────────┴──────────┴──────┘

نمایش ۲۰ از ؟          [بارگذاری بیشتر →]
```

### Empty State

```
        [illustration]
   هنوز مشتری ثبت نکرده‌اید
   اولین مشتری خود را اضافه کنید.
        [＋ مشتری جدید]
```

### Filters (defaults)

| Filter | Default | URL param |
|--------|---------|-----------|
| search | `""` | `?search=` |
| tags | all | `?tags=` |
| sort | `createdAt:desc` | `?sort=` |
| limit | `20` | `?limit=` |

### Cursor Pagination UI

- نمایش `data.length` + indicator `hasMore`
- دکمه «بارگذاری بیشتر» → append با `cursor=nextCursor`
- حفظ scroll position
- Loading spinner روی دکمه

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/customers/page.tsx` |
| Create | `apps/web/components/customers/customer-list-filters.tsx` |
| Create | `apps/web/components/customers/customer-table.tsx` |
| Create | `apps/web/components/customers/customer-empty-state.tsx` |
| Create | `apps/web/hooks/use-customers-list.ts` |

---

## مراحل پیاده‌سازی

1. URL search params sync با filters (nuqs یا useSearchParams)
2. React Query infinite query با cursor
3. Phone mask: `formatPhoneDisplay` + middle mask
4. Tag badge component
5. Row action dropdown
6. Empty/error/skeleton states

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| search no results | Empty «نتیجه‌ای یافت نشد» + clear filters |
| API 403 | NoPermissionPage |
| Stale cursor 400 | reset to first page |
| Soft-deleted customers | not in list (API default) |

---

## تست

- [ ] E2E: list shows seed customer
- [ ] E2E: search filters results
- [ ] Unit: cursor append logic

---

## UX

- [x] Page §7: full checklist
- [x] List §6.4: search, filter, pagination, empty, skeleton, error
- [x] Mobile: horizontal scroll table or card view

---

## Policy Alignment

- [x] EXCELLENCE-STANDARDS §7, §8 TenantCustomer list fields
- [x] Cursor pagination per api-contracts
- [x] SOFT-DELETE — deleted invisible

---

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-007
- `docs/02-architecture/api-contracts.md` — GET customers

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
