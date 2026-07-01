# IFP-TASK-105: Use Case + API — Gateway یکپارچه پرداخت

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-02-Payment-Methods-Unified |
| ID | IFP-TASK-105 |
| Priority | P0 |
| Depends on | IFP-TASK-104, IFP-TASK-103 |
| Blocks | IFP-TASK-107, IFP-TASK-117, IFP-TASK-118 |
| Estimated | 8h |

---

## هدف

**API واحد** `POST /api/v1/payments` — dispatch به use caseهای IFP-087–091 بر اساس `method` — با بررسی روش فعال tenant، idempotency و پاسخ یکپارچه.

---

## معیار پذیرش

- [ ] `CreateUnifiedPaymentUseCase` — strategy pattern per method
- [ ] API `POST /api/v1/payments`
- [ ] API `GET /api/v1/payments/methods` — لیست روش‌های فعال
- [ ] Permission: `installments.payment.report`
- [ ] Disabled method → `403 PAYMENT_METHOD_DISABLED`
- [ ] Plan entitlement check for pro methods (online, wallet)
- [ ] Idempotency-Key header
- [ ] Response: `PaymentAttemptDetail` + optional `redirectUrl` (online)
- [ ] Integration tests per method dispatch

---

## مشخصات فنی

### Create API

```
POST /api/v1/payments
Permission: installments.payment.report
Headers: Idempotency-Key, X-Branch-Id
Body: CreateUnifiedPaymentSchema (discriminated union)
```

### Response `201`

```json
{
  "paymentAttempt": { "id": "uuid", "status": "pending", "method": "cash", "amountRial": "5000000" },
  "redirectUrl": null
}
```

### Online response

```json
{
  "paymentAttempt": { "id": "uuid", "status": "pending", "method": "online" },
  "redirectUrl": "https://gateway.ir/pay/..."
}
```

### Dispatch table

| Unified method | Delegates to |
|----------------|--------------|
| cash, in_person | RecordCashManualPaymentUseCase |
| bank_transfer | RecordBankTransferPaymentUseCase |
| card | RecordPosPaymentUseCase |
| online | InitOnlinePaymentUseCase |
| check | RecordCheckPaymentUseCase |
| wallet | WalletPaymentUseCase (stub) |

### Methods list API

```
GET /api/v1/payments/methods
Permission: installments.payment.read
```

```json
{
  "methods": [
    { "method": "cash", "enabled": true, "labelFa": "نقدی" },
    { "method": "online", "enabled": false, "labelFa": "آنلاین", "disabledReason": "plan_required" }
  ]
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/create-unified-payment.use-case.ts` |
| Create | `packages/application/payments/list-enabled-payment-methods.use-case.ts` |
| Create | `apps/api/src/modules/payments/unified-payments.controller.ts` |
| Create | `packages/application/payments/create-unified-payment.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Method registry + dispatch
2. Enabled methods loader from settings (IFP-106)
3. Plan entitlement guard
4. Unified controller
5. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Method disabled | 403 | `PAYMENT_METHOD_DISABLED` |
| Plan insufficient | 403 | `PLAN_ENTITLEMENT_REQUIRED` |
| Invalid method body | 400 | Zod |
| Idempotent retry | 200/201 | same attempt |

---

## تست

- [ ] Integration: cash dispatch
- [ ] Integration: disabled method 403
- [ ] Integration: online returns redirectUrl
- [ ] RBAC deny

---

## UX

N/A — IFP-117 uses unified API.

---

## Flow

```
UI → GET methods → show enabled only → POST /payments with selected method
```

---

## Policy Alignment

- [ ] ADR-008 pending on create
- [ ] Idempotency financial POST
- [ ] ADR-015 scope

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶
- IFP-TASK-104, IFP-087–091

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | dispatch table |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
