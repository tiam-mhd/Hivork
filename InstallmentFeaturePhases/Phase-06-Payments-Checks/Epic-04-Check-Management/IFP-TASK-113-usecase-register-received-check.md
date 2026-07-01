# IFP-TASK-113: Use Case + API — چک دریافتی

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-04-Check-Management |
| ID | IFP-TASK-113 |
| Priority | P0 |
| Depends on | IFP-TASK-112 |
| Blocks | IFP-TASK-115, IFP-TASK-116, IFP-TASK-117, IFP-TASK-118 |
| Estimated | 6h |

---

## هدف

ثبت **چک دریافتی** (RECEIVED) — standalone یا لینک از PaymentAttempt IFP-091 — با audit `check.register` و optional ledger entry on confirm path.

---

## معیار پذیرش

- [ ] `RegisterReceivedCheckUseCase`
- [ ] API `POST /api/v1/checks/received`
- [ ] API `GET /api/v1/checks` — list with filters
- [ ] Permission POST: `installments.check.create`
- [ ] Permission GET: `installments.check.read`
- [ ] `checkType: RECEIVED`, initial status `REGISTERED`
- [ ] Link optional `installmentId`, `paymentAttemptId`
- [ ] Promote IFP-091 metadata stubs to full Check row
- [ ] Audit: `check.register`
- [ ] Integration tests

---

## مشخصات فنی

### API

```
POST /api/v1/checks/received
Permission: installments.check.create
Headers: X-Branch-Id
```

### Request

```json
{
  "checkNumber": "1234567",
  "bankName": "ملت",
  "bankBranchCode": "1234",
  "amountRial": "20000000",
  "dueDate": "1405-12-01",
  "drawerName": "علی احمدی",
  "sayadId": "1234567890123456",
  "installmentId": "uuid",
  "paymentAttemptId": "uuid",
  "note": "چک بابت قسط ۳"
}
```

### Response `201`

```json
{
  "check": {
    "id": "uuid",
    "checkType": "received",
    "status": "registered",
    "checkNumber": "1234567",
    "amountRial": "20000000",
    "dueDate": "1405-12-01T00:00:00.000Z"
  }
}
```

### List API

```
GET /api/v1/checks?checkType=received&status=registered&dueFrom=&dueTo=&cursor=
Permission: installments.check.read
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/register-received-check.use-case.ts` |
| Create | `packages/application/payments/list-checks.use-case.ts` |
| Create | `packages/contracts/src/payments/check.schema.ts` |
| Create | `apps/api/src/modules/payments/checks.controller.ts` |
| Create | `packages/application/payments/register-received-check.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Zod schemas for received check
2. Register use case + duplicate check number guard
3. List use case cursor pagination
4. Controller
5. Backfill link from payment attempt metadata
6. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate checkNumber+bank | 409 | `CHECK_NUMBER_DUPLICATE` |
| Invalid dueDate past (setting) | 400 | `DUE_DATE_INVALID` |
| installmentId wrong tenant | 404 | not found |
| paymentAttempt not check method | 400 | `PAYMENT_METHOD_MISMATCH` |

---

## تست

- [ ] Integration: register received check
- [ ] Integration: link from payment attempt
- [ ] Integration: list filters
- [ ] RBAC deny

---

## UX

N/A — IFP-117.

---

## Flow

```
چک‌ها → ثبت دریافتی → فرم → ذخیره → لیست
```

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] ADR-015 branch scope
- [ ] Audit check.register
- [ ] SOFT-DELETE

---

## مراجع

- `docs/01-product/installment-module-features.md` §۷ — دریافتی
- IFP-TASK-091, IFP-TASK-111

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۷ |
| **جمع** | **100** | **100** | ≥95 ✅ |
