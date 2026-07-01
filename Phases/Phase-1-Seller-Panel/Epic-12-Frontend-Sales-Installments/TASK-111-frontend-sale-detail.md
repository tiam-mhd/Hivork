# TASK-111: Frontend — Sale Detail + Cancel

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-12-Frontend-Sales-Installments |
| ID | TASK-111 |
| Priority | P0 |
| Depends on | TASK-109, TASK-089 |
| Blocks | — |
| Estimated | 10h |

---

## هدف

صفحه جزئیات فروش: اطلاعات sale، جدول اقساط با رنگ وضعیت، لینک مشتری، و action لغو فروش (modal + دلیل) اگر permission و BR-012 اجازه دهد — مطابق SF-003 و SF-006.

---

## معیار پذیرش

- [ ] Route `/admin/sales/[id]`
- [ ] Permission view: `installments.sale.view`
- [ ] Installment table: sequence, amount, due date, status color
- [ ] Status colors: pending ⏳, paid ✅, overdue 🔴, waived ⚪, cancelled —
- [ ] Customer link → `/admin/customers/[id]/edit`
- [ ] Cancel button: visible if `installments.sale.cancel` + sale active + no paid installments
- [ ] Cancel modal: reason required (min 10 chars)
- [ ] POST cancel → refresh + toast
- [ ] Page states: skeleton, 404, error, no-permission

---

## مشخصات فنی

### Route

```
apps/web/app/(seller)/admin/sales/[id]/page.tsx
```

### Permissions

| Action | Permission |
|--------|------------|
| View | `installments.sale.view` |
| Cancel | `installments.sale.cancel` |

### API Endpoints

| Method | Path |
|--------|------|
| GET | `/api/v1/sales/:id` |
| POST | `/api/v1/sales/:id/cancel` |

### Installment Status Colors

| Status | Label (fa) | Color |
|--------|------------|-------|
| pending | در انتظار | amber |
| paid | پرداخت‌شده | green |
| overdue | معوق | red |
| waived | بخشوده | gray |
| cancelled | لغو | gray strikethrough |

### Wireframe

```
Breadcrumb: خانه > فروش‌ها > #SALE-1234

فروش #SALE-1234 — گوشی موبایل          [لغو فروش]
─────────────────────────────────────────
وضعیت: فعال 🟢          شعبه: مرکزی
مشتری: [علی محمدی →]    ۰۹۱۲****۵۶۷
ایجاد: ۱۴۰۵/۰۱/۱۵       توسط: رضا کاشانی

مبلغ کل: ۶,۰۰۰,۰۰۰ تومان    پیش‌پرداخت: ۰

اقساط
┌──────┬────────────┬────────────┬──────────────┐
│ قسط  │ مبلغ       │ سررسید     │ وضعیت        │
├──────┼────────────┼────────────┼──────────────┤
│ ۱    │ ۱,۵۰۰,۰۰۰  │ ۱۴۰۵/۰۲/۱۵ │ پرداخت‌شده ✅ │
│ ۲    │ ۱,۵۰۰,۰۰۰  │ ۱۴۰۵/۰۳/۱۵ │ پرداخت‌شده ✅ │
│ ۳    │ ۱,۵۰۰,۰۰۰  │ ۱۴۰۵/۰۴/۱۵ │ معوق 🔴      │
│ ۴    │ ۱,۵۰۰,۰۰۰  │ ۱۴۰۵/۰۵/۱۵ │ در انتظار ⏳  │
└──────┴────────────┴────────────┴──────────────┘
```

### Cancel Modal

| Field | Label | Placeholder | Help | Required |
|-------|-------|-------------|------|----------|
| reason | دلیل لغو | مثال: مشتری پشیمان شد | این دلیل در گزارش audit ثبت می‌شود | ✅ min 10 |

```
┌─────────────────────────────────┐
│ لغو فروش                        │
│ ⚠ این عمل قابل بازگشت نیست.      │
│ آیا از لغو فروش #1234 مطمئنید؟  │
│                                 │
│ دلیل لغو *                      │
│ [________________________]      │
│                                 │
│ [انصراف]          [لغو فروش]   │
└─────────────────────────────────┘
```

### Cancel Button Visibility Logic (UI only)

```typescript
const canCancel =
  hasPermission('installments.sale.cancel') &&
  sale.status === 'active' &&
  !sale.installments.some(i => i.status === 'paid');
```

### Error Mapping (cancel)

| Code | UI |
|------|-----|
| `SALE_HAS_PAID_INSTALLMENT` | toast + hide cancel button on refresh |
| `SALE_ALREADY_CANCELLED` | toast + refresh |
| `PERMISSION_DENIED` | toast |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/sales/[id]/page.tsx` |
| Create | `apps/web/components/sales/sale-detail-header.tsx` |
| Create | `apps/web/components/sales/installment-table.tsx` |
| Create | `apps/web/components/sales/cancel-sale-modal.tsx` |
| Create | `apps/web/hooks/use-sale-detail.ts` |

---

## مراحل پیاده‌سازی

1. Fetch sale with installments
2. Header with metadata + status badge
3. Installment table with status chips
4. Customer link component
5. Cancel modal with RHF
6. Optimistic refresh after cancel
7. notFound() for 404

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Sale cancelled | banner gray + hide cancel |
| Paid exists | no cancel button + tooltip why |
| Cross-tenant 404 | not found page |
| Version conflict | unlikely — show error toast |

---

## تست

- [ ] E2E: view sale detail after create
- [ ] E2E: cancel sale without paid → status cancelled
- [ ] E2E: cancel blocked when paid installment (seed)
- [ ] Unit: canCancel logic

---

## UX

- [x] Page §7 states
- [x] Modal §5: loading, validation, Esc close
- [x] Money Toman display
- [x] Focus trap in modal

---

## Policy Alignment

- [x] BR-012 cancel rules
- [x] SF-003, SF-006
- [x] Audit reason required (backend)
- [x] state-machines.md colors

---

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-003, SF-006
- `docs/03-modules/installments/BUSINESS-RULES.md` — BR-011–BR-014
- `docs/03-modules/installments/state-machines.md`

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
