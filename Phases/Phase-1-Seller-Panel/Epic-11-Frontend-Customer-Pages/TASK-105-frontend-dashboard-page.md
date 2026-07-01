# TASK-105: Frontend — Dashboard Page

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-11-Frontend-Customer-Pages |
| ID | TASK-105 |
| Priority | P0 |
| Depends on | TASK-102, TASK-104, TASK-083, TASK-090 |
| Blocks | TASK-113 |
| Estimated | 8h |

---

## هدف

صفحه داشبورد پنل فروشنده با KPI cards از REPORTS.md، جدول ۱۰ قسط سررسید امروز، quick actions (فروش/مشتری جدید)، و نمودار ۳۰ روزه وصولی (P1 optional).

---

## معیار پذیرش

- [ ] Route `/admin/dashboard` (alias `/admin` redirect)
- [ ] KPI cards: today due count, overdue count, month collected, active sales
- [ ] جدول top 10 today-due با لینک به sale/customer
- [ ] Quick actions: «فروش جدید»، «مشتری جدید» — gated by permission
- [ ] Skeleton loading، empty today-due state، error retry
- [ ] No-permission: `installments.report.dashboard`
- [ ] Last updated timestamp + manual refresh
- [ ] (P1) Bar chart 30-day collections از `GET /reports/cashflow`

---

## مشخصات فنی

### Route

```
apps/web/app/(seller)/admin/dashboard/page.tsx
```

### Permission

`installments.report.dashboard` — همه roles پیش‌فرض (owner, manager, cashier, viewer).

### API Endpoints

| Method | Path | کاربرد |
|--------|------|--------|
| GET | `/api/v1/reports/dashboard` | KPI cards |
| GET | `/api/v1/reports/today-due?limit=10` | جدول امروز |
| GET | `/api/v1/reports/cashflow?from=&to=` | نمودار P1 |

### Response Mapping (KPI)

| Card Label (fa) | API Field | Format |
|-----------------|-----------|--------|
| قسط‌های سررسید امروز | `todayDueCount` | عدد فارسی |
| معوقات | `overdueCount` | عدد فارسی |
| دریافتی این ماه | `thisMonthCollectedRial` | `formatToman` |
| فروش‌های فعال | `activeSalesCount` | عدد فارسی |

### Wireframe

```
Breadcrumb: خانه > داشبورد

داشبورد — {tenantName} — {branchName}
آخرین به‌روزرسانی: ۱۴:۳۲  [↻]

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ سررسید   │ │ معوقات   │ │ دریافتی  │ │ فروش     │
│ امروز: ۱۲│ │ ۸        │ │ ماه: ۴۵M │ │ فعال: ۴۷ │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

[＋ فروش جدید]  [＋ مشتری جدید]

قسط‌های سررسید امروز
┌────────┬──────────┬─────────┬────────┬────────┐
│ مشتری  │ فروش     │ قسط     │ مبلغ   │ عمل  │
├────────┼──────────┼─────────┼────────┼────────┤
│ علی... │ #1234    │ ۳ از ۴  │ ۱.۵M   │ [→]  │
└────────┴──────────┴─────────┴────────┴────────┘
[مشاهده همه → /admin/reports/today-due]

(P1) نمودار وصولی ۳۰ روز گذشته
[████████ bar chart ████████]
```

### Page States

| State | UI |
|-------|-----|
| Loading | Skeleton cards (4) + table rows (5) |
| Empty today-due | «امروز قسطی سررسید ندارید 🎉» |
| Error | «خطا در بارگذاری» + [تلاش مجدد] |
| No permission | `NoPermissionPage` |
| Partial (KPI ok, table fail) | KPI shown + table error inline |

### Breadcrumb

`خانه` → `داشبورد`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/dashboard/page.tsx` |
| Create | `apps/web/components/dashboard/kpi-card.tsx` |
| Create | `apps/web/components/dashboard/today-due-table.tsx` |
| Create | `apps/web/components/dashboard/quick-actions.tsx` |
| Create | `apps/web/components/dashboard/collections-chart.tsx` |
| Create | `apps/web/hooks/use-dashboard.ts` |

---

## مراحل پیاده‌سازی

1. `RequirePermission` wrapper
2. React Query: parallel fetch dashboard + today-due
3. KPI grid responsive (2 col mobile, 4 desktop)
4. Today-due table با row link به `/admin/sales/[id]`
5. Quick actions با permission gates
6. Refresh button invalidates queries
7. (P1) recharts bar chart با cashflow API

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| API 403 | NoPermissionPage |
| API 500 | Error state full page |
| Branch switch | auto-refetch all widgets |
| today-due empty | CTA به فروش جدید |
| Cashier branch scope | data already scoped by API |

---

## تست

- [ ] E2E: dashboard loads KPI after login
- [ ] Component: quick action hidden without permission
- [ ] Visual: KPI skeleton matches layout

---

## UX

- [x] Page §7: breadcrumb, title, actions, skeleton, empty, error, no-permission
- [x] Clickable KPI overdue → `/admin/reports/overdue`
- [x] RTL table alignment

---

## Policy Alignment

- [x] EXCELLENCE-STANDARDS §7.2 Dashboard widgets
- [x] REPORTS.md §1
- [x] ADR-015 data scope via API

---

## مراجع

- `docs/03-modules/installments/REPORTS.md` — §1
- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-010
- `docs/02-architecture/api-contracts.md` — reports/dashboard

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 24 |
| Policy | /25 | 25 |
| Executability | /25 | 25 |
| Alignment | /15 | 15 |
| **جمع** | **/100** | **99** |
