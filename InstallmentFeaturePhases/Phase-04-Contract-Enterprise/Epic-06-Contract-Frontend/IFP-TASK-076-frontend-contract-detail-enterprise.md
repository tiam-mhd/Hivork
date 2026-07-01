# IFP-TASK-076: Frontend — Contract Detail Enterprise

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-06-Contract-Frontend |
| ID | IFP-TASK-076 |
| Priority | P0 |
| Depends on | IFP-TASK-064, IFP-TASK-067, IFP-TASK-071, IFP-TASK-058, Phase 1 TASK-111 |
| Blocks | IFP-077 |
| Estimated | 12h |

---

## هدف

صفحه **جزئیات قرارداد Enterprise** — تب‌های نسخه‌ها، پیوست، ضامن، وثیقه، اقلام/مالیات/بیمه، تقویم اقساط — با Excellence §7 page states.

---

## معیار پذیرش

- [ ] Route: `/contracts/:saleId` (or extend `/sales/:saleId`)
- [ ] Breadcrumb: داشبورد → قراردادها → {contractNumber || title}
- [ ] Tabs: خلاصه، اقساط، اقلام، ضامنین، وثیقه، پیوست‌ها، نسخه‌ها، تاریخچه
- [ ] Header: status badge (all 6 statuses)، contractNumber، customer link
- [ ] Permission-based action menu (hidden disabled — not gray only)
- [ ] States: skeleton, empty per tab, error, 404, archived read-only banner
- [ ] Zod + RHF for inline edits where applicable
- [ ] RTL, mobile responsive, Jalali dates per `calendar_display_mode`
- [ ] Print button hook (window.print CSS) — §۴ چاپ قرارداد

---

## مشخصات فنی

### Page structure

```
ContractDetailPage
├── ContractHeader (status, number, actions dropdown)
├── ContractSummaryTab (financials, dates, customTerms, signature)
├── InstallmentsTab (reuse Phase 1 TASK-111)
├── LineItemsTab (editable grid → IFP-071 API)
├── GuarantorsTab (table + add modal → IFP-067)
├── CollateralsTab (cards + status badges)
├── AttachmentsTab (upload list → IFP-064)
├── VersionsTab (timeline → IFP-064 versions)
└── ActivityTab (audit feed — read-only)
```

### API consumption

| Tab | Endpoint |
|-----|----------|
| Detail | GET `/sales/:id` enterprise |
| Line items | GET/PUT `/sales/:id/line-items` |
| Guarantors | CRUD `/sales/:id/guarantors` |
| Collaterals | CRUD `/sales/:id/collaterals` |
| Attachments | GET/POST `/sales/:id/attachments` |
| Versions | GET `/sales/:id/versions` |

### Archived read-only

When `status === archived` or `archivedAt`: disable all edit controls; show info banner.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(staff)/contracts/[saleId]/page.tsx` |
| Create | `apps/web/src/features/contracts/components/ContractDetailTabs.tsx` |
| Create | `apps/web/src/features/contracts/tabs/*.tsx` |
| Update | `apps/web/src/features/sales/SaleDetailPage.tsx` — redirect or merge |

---

## مراحل پیاده‌سازی

1. Extend or replace sale detail route
2. Fetch enterprise DTO with parallel tab queries
3. Implement each tab with empty/error states
4. Wire permission hooks `usePermission('installments.sale.*')`
5. Archived banner + disable edits
6. Print stylesheet for summary tab
7. Manual RTL/mobile QA

---

## Edge Cases & Errors

| سناریو | UX |
|--------|-----|
| 404 sale | Full page not found |
| 403 view | No permission state |
| VERSION_CONFLICT on save | Toast + refresh |
| Empty guarantors | Empty state + CTA add |
| Upload fail | Field error on attachment |

---

## تست

- [ ] E2E: navigate to contract detail — tabs render
- [ ] E2E: archived contract — edit disabled
- [ ] Component: status badge all variants
- [ ] a11y: tab keyboard navigation

---

## UX

- [ ] Excellence §5 — labels, placeholders, fa validation, loading, server errors
- [ ] Excellence §7 — breadcrumb, title, actions, filters, skeleton/empty/error
- [ ] Unsaved warning on line items grid
- [ ] Mobile: tabs → select dropdown

---

## Flow

```
entry: contract list → row click
steps: browse tabs → inline edit line items → save
errors: permission, conflict, network
exit: back to list or customer profile link
```

---

## Policy Alignment

- [ ] Permission UI only — backend enforces
- [ ] Contracts from `@hivork/contracts`
- [ ] No business logic in component — hooks call API

---

## مراجع

- Phase 1 `TASK-111-frontend-sale-detail.md`
- IFP-TASK-064, 067, 071
- `docs/09-development/EXCELLENCE-STANDARDS.md` §5–7

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 24 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **99** |
