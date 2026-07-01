# IFP-TASK-053: Customer List + Detail Pages (All States)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-07-Customer-Frontend |
| ID | IFP-053 |
| Priority | P0 |
| Depends on | **IFP-019** (DataTable), IFP-039, IFP-040, IFP-044, IFP-045, IFP-046, IFP-047, IFP-048, IFP-049, IFP-042 |
| Blocks | IFP-054 |
| Estimated | 16h |
| UI dependency note | **الزامی:** IFP-019 DataTable و shared filters از Phase-02 قبل از شروع UI list |

---

## هدف

صفحات Enterprise **لیست** و **جزئیات** مشتری — تمام tabها، actions (archive, merge, transfer, export, import entry)، forms create/edit، و **همه page states** Excellence §7 — پوشش کامل §۳ UI.

---

## معیار پذیرش

### Routes

- [ ] `/admin/customers` — list
- [ ] `/admin/customers/new` — create form
- [ ] `/admin/customers/[id]` — detail
- [ ] `/admin/customers/[id]/edit` — edit form
- [ ] `/admin/customers/import` — import wizard entry

### List page

- [ ] **IFP-019 DataTable** with columns: name, phone (masked), localCode, category, tags, creditScore, status badges, assigned staff, actions
- [ ] Live search debounced 300ms → IFP-040
- [ ] Filter drawer: category, tags, status, blacklist, branch, staff, date range
- [ ] Sort header sync with API
- [ ] Cursor infinite scroll or pagination
- [ ] Bulk actions disabled P1 — single row actions only
- [ ] Export Excel/PDF buttons → IFP-042
- [ ] Import button → IFP-041 flow
- [ ] Print friendly CSS

### Detail page tabs

| Tab | Source task |
|-----|-------------|
| overview | IFP-036/037 detail |
| addresses + map | IFP-045 |
| documents | IFP-044 |
| timeline | IFP-046 |
| payments | IFP-048 |
| contracts | IFP-049 |
| notes | IFP-047 |

### Detail actions (permission gated)

Create sale shortcut, edit, archive, delete, restore (admin list), merge IFP-050, transfer IFP-051, blacklist/unblacklist IFP-052, export single PDF optional

### Forms (create/edit)

- [ ] Excellence §5: labels, placeholders, help fa, validation, loading, server errors, unsaved warning, a11y, RTL, mobile input types
- [ ] Sections: basic info, category/tags, addresses repeater, emergency contacts, secondary phones, assignment
- [ ] Phone field disabled on edit

### Page states (mandatory all pages)

- [ ] Loading skeleton
- [ ] Empty list + CTA
- [ ] Error + retry
- [ ] No permission message
- [ ] Partial load cached + refresh
- [ ] 404 customer not found
- [ ] Optimistic lock conflict dialog

### Layout

- [ ] Breadcrumb: داشبورد → مشتریان → {name}
- [ ] Title + primary actions toolbar
- [ ] Mobile responsive — tabs scroll horizontal

---

## مشخصات فنی

### Permission UX map

| Action | Permission |
|--------|------------|
| View list | installments.customer.list |
| Create | installments.customer.create |
| Edit | installments.customer.update |
| Delete | installments.customer.delete |
| Merge | installments.customer.merge |
| Transfer | installments.customer.transfer |
| Export | installments.customer.export |
| Import | installments.customer.import |

Buttons hidden/disabled when denied — backend still authoritative

### State management

React Query for list/detail/cache invalidation on mutations

### i18n

All strings fa — dates Jalali via dayjs

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `apps/web/app/(admin)/customers/page.tsx` |
| Create/Update | `apps/web/app/(admin)/customers/new/page.tsx` |
| Create/Update | `apps/web/app/(admin)/customers/[id]/page.tsx` |
| Create/Update | `apps/web/app/(admin)/customers/[id]/edit/page.tsx` |
| Create | `apps/web/app/(admin)/customers/components/customer-filters.tsx` |
| Create | `apps/web/app/(admin)/customers/components/customer-form.tsx` |
| Create | `apps/web/app/(admin)/customers/components/customer-detail-tabs.tsx` |
| Create | `apps/web/lib/api/customers.ts` |

---

## مراحل پیاده‌سازی

1. API client hooks all endpoints
2. List page with IFP-019 DataTable
3. Filters + search wiring
4. Create/edit form with Zod resolver IFP-039
5. Detail layout + tabs lazy load
6. Action menus + dialogs
7. All page states + E2E smoke paths
8. RTL/mobile QA checklist

---

## Edge Cases & Errors

| سناریو | UI behavior |
|--------|-------------|
| 409 on save version | refresh dialog |
| Blacklisted customer | banner + disable new sale |
| Archived filter | toggle in filters |
| Network offline | partial cached list |
| Long name truncate | tooltip |

---

## تست

- [ ] E2E: create customer → appears in list
- [ ] E2E: edit customer → detail updates
- [ ] E2E: list empty state
- [ ] E2E: no permission page
- [ ] Visual: RTL layout key pages

---

## UX

- [ ] Excellence §5 full form checklist
- [ ] Excellence §7 all page states
- [ ] Keyboard shortcuts: / focus search
- [ ] Screen reader labels on actions

---

## Flow

```
List flow:
Entry: nav مشتریان
Load DataTable → filter/search
Click row → detail

Create flow:
List → جدید → form → save → detail

Detail flow:
Tabs lazy load data
Actions menu contextual
Back → list preserves filters sessionStorage

Import flow:
List → import → IFP-041 wizard → return list
```

---

## Policy Alignment

- [ ] EXCELLENCE §5–§7
- [ ] IFP-019 dependency explicit
- [ ] Permission UX only
- [ ] No business logic in component — hooks call API

---

## مراجع

- `docs/01-product/installment-module-features.md` §۳
- `InstallmentFeaturePhases/Phase-02-CrossCutting-UI/` — IFP-019
- `docs/03-modules/installments/STAFF-FLOWS.md` SF-007

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
