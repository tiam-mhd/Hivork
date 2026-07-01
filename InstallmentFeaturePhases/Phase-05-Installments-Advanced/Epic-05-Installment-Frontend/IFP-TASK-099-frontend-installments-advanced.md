# IFP-TASK-099: Frontend — اقساط پیشرفته

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-05-Installment-Frontend |
| ID | IFP-TASK-099 |
| Priority | P0 |
| Depends on | IFP-TASK-080, IFP-TASK-081, IFP-TASK-082, IFP-TASK-083, IFP-TASK-084, IFP-TASK-085, IFP-TASK-086, IFP-TASK-087, IFP-TASK-088, IFP-TASK-089, IFP-TASK-090, IFP-TASK-091, IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095, IFP-TASK-096, IFP-TASK-097, IFP-TASK-098 |
| Blocks | IFP-TASK-100 |
| Estimated | 16h |

---

## هدف

UI Enterprise **مدیریت اقساط** — لیست با فیلتر و رنگ‌بندی وضعیت، جزئیات با timeline عملیات/پرداخت‌ها، یادداشت داخلی، پیوست فایل، و تمام actions (عملیات، ثبت پرداخت، تأیید/رد، تعدیلات) با permission-based UX.

---

## معیار پذیرش

- [ ] Route `/admin/installments` — لیست cursor-paginated
- [ ] Route `/admin/installments/:id` — جزئیات
- [ ] Route `/admin/sales/:saleId/installments` — اقساط قرارداد
- [ ] DataTable با فیلتر: status, dueDate range, sale, customer, branch
- [ ] رنگ‌بندی: pending=آبی، overdue=قرمز، paid=سبز، waived=خاکستری
- [ ] Actions gated by permissions (UX only — backend enforces)
- [ ] Modals/wizards: reschedule, defer, accelerate, merge, split, regenerate
- [ ] Payment recording tabs: cash, bank, pos, online, check, fee
- [ ] Pending payments panel: confirm/reject/void/receipt
- [ ] Waive, penalty preview, discount forms
- [ ] Internal notes CRUD + file upload on installment
- [ ] Breadcrumb, skeleton, empty, error, no-permission states
- [ ] RTL + mobile responsive + fa validation messages

---

## مشخصات فنی

### Routes

| Path | Component | Permission (view) |
|------|-----------|-------------------|
| `/admin/installments` | `InstallmentsListPage` | `installments.installment.read` |
| `/admin/installments/[id]` | `InstallmentDetailPage` | `installments.installment.read` |
| `/admin/sales/[saleId]/installments` | `SaleInstallmentsPage` | `installments.sale.read` |

### List API integration

```
GET /api/v1/installments?cursor=&limit=20&status=&dueFrom=&dueTo=&search=
Headers: X-Branch-Id
```

### Status badge component

```tsx
const STATUS_COLORS = {
  pending: 'bg-blue-100 text-blue-800',
  overdue: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  waived: 'bg-gray-100 text-gray-600',
} as const;
```

### Detail page sections

1. **Header** — sequence, amount (Toman formatted), status badge, due date Jalali
2. **Actions dropdown** — permission-filtered menu items
3. **Payments timeline** — attempts with status chips + actions
4. **Operations timeline** — from InstallmentOperationLog API
5. **Adjustments table** — penalties/discounts
6. **Notes** — `InstallmentNote` list + add form
7. **Attachments** — file list + upload (reuse IFP file patterns)

### Forms (Excellence §5)

Each form: label, placeholder, help text, loading state, server error display, unsaved warning (`beforeunload`), a11y `aria-*`, RTL layout.

### Amount display

```typescript
// Display Toman: formatFaToman(installment.amountRial) — divide by 10n in formatter
```

### Permission map (actions)

| Action | Permission |
|--------|------------|
| Reschedule | `installments.installment.reschedule` |
| Record payment | `installments.payment.report` |
| Confirm | `installments.payment.confirm` |
| Waive | `installments.installment.waive` |
| Penalty | `installments.installment.penalty` |
| Discount | `installments.installment.discount` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(staff)/admin/installments/page.tsx` |
| Create | `apps/web/src/app/(staff)/admin/installments/[id]/page.tsx` |
| Create | `apps/web/src/features/installments/components/installments-data-table.tsx` |
| Create | `apps/web/src/features/installments/components/installment-detail-header.tsx` |
| Create | `apps/web/src/features/installments/components/installment-actions-menu.tsx` |
| Create | `apps/web/src/features/installments/components/payment-recording-wizard.tsx` |
| Create | `apps/web/src/features/installments/components/operation-modals/` |
| Create | `apps/web/src/features/installments/hooks/use-installment-mutations.ts` |
| Create | `apps/web/src/features/installments/api/installments-api.ts` |

---

## مراحل پیاده‌سازی

1. API client hooks for all IFP-080–098 endpoints
2. List page with DataTable engine (IFP-019+)
3. Detail page layout + timelines
4. Operation modals one by one
5. Payment recording wizard
6. Notes + attachments
7. Page states + permission gates
8. E2E smoke (deferred to IFP-100)

---

## Edge Cases & Errors

| سناریو | UI رفتار |
|--------|----------|
| 409 VERSION_CONFLICT | toast + auto-refresh detail |
| 403 no permission | hide action + NoPermissionState if page-level |
| Empty list | EmptyState با CTA «مشاهده قراردادها» |
| Network error | ErrorState با retry |
| Paid installment | disable operation actions (greyed + tooltip) |

---

## تست

- [ ] Component: status badge colors
- [ ] Component: permission gates hide actions
- [ ] E2E smoke: list loads (IFP-100)
- [ ] a11y: form labels present

---

## UX

- [ ] Breadcrumb: داشبورد → اقساط → جزئیات
- [ ] Title + primary actions در header
- [ ] Filters persist in URL query
- [ ] Skeleton rows on load
- [ ] Empty state illustration + copy فارسی
- [ ] Error boundary per section
- [ ] No-permission full page state
- [ ] Unsaved form warning
- [ ] Mobile: stacked layout, `inputMode="numeric"` for amounts
- [ ] RTL: date pickers Jalali

---

## Flow

```
Entry: منو → اقساط → لیست فیلترشده
Detail: کلیک ردیف → جزئیات → action → modal → submit → refresh timeline
Payment: ثبت پرداخت → wizard روش → submit → pending در timeline
Confirm: timeline → تأیید → paid badge
Exit: breadcrumb back یا منو
Recovery: version conflict → refresh; network → retry button
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §5 forms
- [ ] EXCELLENCE-STANDARDS §7 pages
- [ ] Permission UX only — backend guards mandatory
- [ ] bigint display via formatters — no float math

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵
- IFP Phase-02 DataTable engine
- `docs/03-modules/installments/STAFF-FLOWS.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | all UI surfaces |
| Policy | 25 | 25 | Excellence §5/7 |
| Executability | 25 | 25 | routes + files |
| Alignment | 15 | 15 | §۵ product |
| **جمع** | **100** | **100** | ≥95 ✅ |
