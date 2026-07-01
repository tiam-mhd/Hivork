# IFP-TASK-117: Frontend — پرداخت‌ها و چک‌ها

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-05-Payments-Frontend |
| ID | IFP-TASK-117 |
| Priority | P0 |
| Depends on | IFP-TASK-103, IFP-TASK-104, IFP-TASK-107, IFP-TASK-113, IFP-TASK-116 |
| Blocks | IFP-TASK-118 |
| Estimated | 12h |

---

## هدف

صفحات **پرداخت‌ها** (لیست تراکنش‌ها، فیلتر، جزئیات، استرداد/ابطال) و **چک‌ها** (لیست، ثبت دریافتی/پرداختی، وصول، برگشت، انتقال، تصویر) — RTL فارسی با Excellence §7.

---

## معیار پذیرش

- [ ] Route `/admin/payments` — tabbed layout
- [ ] Tab **تراکنش‌ها**: DataTable IFP-019، filters method/status/date
- [ ] Tab **چک‌ها**: list + status badges + due date highlight
- [ ] Modal/drawer: ثبت چک دریافتی/پرداختی
- [ ] Actions: وصول، برگشت، انتقال (permission-gated)
- [ ] Detail drawer: timeline IFP-116، image upload
- [ ] Tab **تسویه** / **مغایرت** — IFP-109/110 UI
- [ ] Receipt/invoice print trigger IFP-095 patterns
- [ ] States: loading skeleton, empty, error, no-permission
- [ ] Mobile responsive
- [ ] bigint amounts formatted تومان/ریال per tenant setting

---

## مشخصات فنی

### Routes

| Path | Component | Permission |
|------|-----------|------------|
| `/admin/payments` | PaymentsPage | `installments.payment.read` |
| `/admin/payments/transactions/[id]` | TransactionDetailDrawer | `installments.payment.read` |
| `/admin/payments/checks/[id]` | CheckDetailPage | `installments.check.read` |

### Tabs

```
[ تراکنش‌ها | چک‌ها | تسویه | مغایرت ]
```

### Check list columns

| Column | Sortable |
|--------|----------|
| شماره چک | ✓ |
| بانک | ✓ |
| مبلغ | dict | ✓ |
| سررسید | ✓ |
| نوع (دریافتی/پرداختی) | filter |
| وضعیت | filter |
| مشتری/قرارداد | link |
| actions | — |

### Status colors

- `registered` — neutral
- `due` — warning (≤3 days amber)
- `collected` — success
- `bounced` — destructive
- `transferred` — info

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/payments/page.tsx` |
| Create | `apps/web/src/features/payments/transactions-table.tsx` |
| Create | `apps/web/src/features/payments/checks-table.tsx` |
| Create | `apps/web/src/features/payments/check-form-modal.tsx` |
| Create | `apps/web/src/features/payments/check-detail-drawer.tsx` |
| Create | `apps/web/src/features/payments/settlement-panel.tsx` |
| Create | `apps/web/src/features/payments/reconciliation-panel.tsx` |

---

## مراحل پیاده‌سازی

1. Page shell + tabs + breadcrumb
2. Transactions table wired to IFP-103 API
3. Checks table + register modals
4. Check actions (collect/bounce/transfer) with confirm dialogs
5. Tracking tab + image upload
6. Settlement/reconciliation panels
7. Permission wrappers + empty states
8. RTL polish

---

## Edge Cases & Errors

| سناریو | UX |
|--------|-----|
| 403 on action | toast + hide button |
| 409 bounce invalid | inline error on modal |
| Network fail | retry banner |
| Large list | cursor pagination |

---

## تست

- [ ] Component: permission hide actions
- [ ] E2E: list transactions smoke (IFP-118)
- [ ] Visual: RTL snapshot optional

---

## UX

- [ ] Excellence §5 forms — check register labels, help, validation fa
- [ ] Excellence §7 — all page states
- [ ] Confirm destructive: bounce, void
- [ ] Unsaved warning on check form
- [ ] a11y: focus trap in modals

---

## Flow

```
Entry: sidebar «پرداخت‌ها»
→ Tab تراکنش‌ها → filter → detail → refund/void
→ Tab چک‌ها → ثبت → list → detail → collect/bounce/transfer
→ Tab تسویه → batch settle
→ Tab مغایرت → compare ledger vs bank
```

---

## Policy Alignment

- [ ] RBAC UI only — backend guards mandatory
- [ ] ADR-007 display formatting
- [ ] IFP-019 DataTable reuse

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶، §۷
- `docs/09-development/EXCELLENCE-STANDARDS.md` §5–7
- IFP-TASK-103–116

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | Routes + tabs |
| Policy | 25 | 25 | RBAC + Excellence |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۶ §۷ |
| **جمع** | **100** | **100** | ≥95 ✅ |
