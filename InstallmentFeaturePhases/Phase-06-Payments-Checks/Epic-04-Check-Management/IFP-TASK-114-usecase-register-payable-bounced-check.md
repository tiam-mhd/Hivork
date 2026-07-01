# IFP-TASK-114: Use Case + API — چک پرداختی و برگشتی

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-04-Check-Management |
| ID | IFP-TASK-114 |
| Priority | P0 |
| Depends on | IFP-TASK-112 |
| Blocks | IFP-TASK-115, IFP-TASK-116, IFP-TASK-117 |
| Estimated | 6h |

---

## هدف

ثبت **چک پرداختی** (PAYABLE) برای تعهدات فروشنده و ثبت **برگشت چک** (BOUNCED) روی چک دریافتی — با audit و domain state transitions.

---

## معیار پذیرش

- [ ] `RegisterPayableCheckUseCase`
- [ ] `MarkCheckBouncedUseCase`
- [ ] API `POST /api/v1/checks/payable`
- [ ] API `POST /api/v1/checks/{id}/bounce`
- [ ] Permission: `installments.check.create`, `installments.check.bounce`
- [ ] Payable initial status `REGISTERED`
- [ ] Bounce: RECEIVED check `REGISTERED|DUE|COLLECTED` → `BOUNCED` (business rule documented)
- [ ] Audit: `check.register.payable`, `check.bounce`
- [ ] Domain event `CheckBounced` → outbox (notify customer optional)
- [ ] Integration tests

---

## مشخصات فنی

### Register Payable

```
POST /api/v1/checks/payable
Permission: installments.check.create
```

```json
{
  "checkNumber": "9876543",
  "bankName": "ملی",
  "amountRial": "50000000",
  "dueDate": "1405-11-15",
  "payeeName": "تأمین‌کننده X",
  "note": "پرداخت بابت کالا"
}
```

### Mark Bounced

```
POST /api/v1/checks/{checkId}/bounce
Permission: installments.check.bounce
```

```json
{
  "bounceReason": "موجودی ناکافی",
  "bouncedAt": "1405-10-01T10:00:00.000Z"
}
```

### State machine

```
RECEIVED: REGISTERED → DUE (scheduler) → COLLECTED | BOUNCED
PAYABLE: REGISTERED → DUE → COLLECTED (paid out) | CANCELLED
BOUNCED: terminal — may spawn new installment penalty (IFP-094 link)
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/register-payable-check.use-case.ts` |
| Create | `packages/application/payments/mark-check-bounced.use-case.ts` |
| Update | `packages/domain/payments/check.entity.ts` |
| Update | `packages/contracts/src/payments/check.schema.ts` |
| Update | `apps/api/src/modules/payments/checks.controller.ts` |

---

## مراحل پیاده‌سازی

1. Extend Check entity with bounce/payable methods
2. Payable register use case
3. Bounce use case + validation (only RECEIVED type)
4. Controller endpoints
5. Outbox event CheckBounced
6. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Bounce PAYABLE check | 400 | `CHECK_TYPE_NOT_RECEIVABLE` |
| Bounce already BOUNCED | 409 | `CHECK_ALREADY_BOUNCED` |
| Bounce COLLECTED (setting off) | 409 | `CHECK_ALREADY_COLLECTED` |
| Missing bounceReason | 400 | validation |

---

## تست

- [ ] Integration: register payable
- [ ] Integration: bounce received check
- [ ] Integration: invalid bounce transitions
- [ ] RBAC: bounce without permission → 403

---

## UX

N/A — IFP-117 modal «ثبت برگشت» با reason required.

---

## Flow

```
چک دریافتی → سررسید → برگشت → (optional) جریمه قسط
چک پرداختی → ثبت → وصول/ابطال
```

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] ADR-013 soft delete only
- [ ] Audit on bounce
- [ ] state-machines documented in task

---

## مراجع

- `docs/01-product/installment-module-features.md` §۷ — پرداختی، برگشتی
- IFP-TASK-112, IFP-TASK-113

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
