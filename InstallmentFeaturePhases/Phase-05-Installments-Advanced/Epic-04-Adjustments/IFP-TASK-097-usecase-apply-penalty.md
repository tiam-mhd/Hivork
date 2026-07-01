# IFP-TASK-097: Use Case + API — ثبت جریمه

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-04-Adjustments |
| ID | IFP-TASK-097 |
| Priority | P0 |
| Depends on | IFP-TASK-079, IFP Phase-04 contract settings |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 6h |

---

## هدف

**ثبت جریمه دیرکرد** روی قسط `overdue` — افزایش `amountRial` یا ایجاد ردیف `InstallmentAdjustment` نوع `penalty` — بر اساس تنظیمات tenant (درصد روزانه یا مبلغ ثابت) با audit `installment.penalty`.

---

## معیار پذیرش

- [ ] `ApplyPenaltyUseCase` + optional `CalculatePenaltyPreviewUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/penalty`
- [ ] API `GET /api/v1/installments/:installmentId/penalty/preview`
- [ ] Permission: `installments.installment.penalty`
- [ ] Settings: `installments.penalty.dailyRateBps`, `installments.penalty.maxRial`, `installments.penalty.graceDays`
- [ ] Model `InstallmentAdjustment` type `PENALTY` append-only
- [ ] Cannot penalty `paid`/`waived`
- [ ] Audit: `installment.penalty`

---

## مشخصات فنی

### Prisma

```prisma
enum InstallmentAdjustmentType {
  PENALTY
  DISCOUNT

  @@map("installment_adjustment_type")
}

model InstallmentAdjustment {
  id             String                    @id @default(uuid()) @db.Uuid
  tenantId       String                    @map("tenant_id") @db.Uuid
  installmentId  String                    @map("installment_id") @db.Uuid
  adjustmentType InstallmentAdjustmentType @map("adjustment_type")
  amountRial     BigInt                    @map("amount_rial")
  reason         String
  appliedAt      DateTime                  @default(now()) @map("applied_at") @db.Timestamptz
  appliedById    String                    @map("applied_by_id") @db.Uuid
  reversedAt     DateTime?                 @map("reversed_at") @db.Timestamptz
  // base fields — soft delete on reversal only via reversedAt, not hard delete
}
```

### Apply API

```
POST /api/v1/installments/:installmentId/penalty
Permission: installments.installment.penalty
```

### Request

```json
{
  "amountRial": "250000",
  "reason": "جریمه ۵ روز تأخیر",
  "mode": "manual"
}
```

Or auto:

```json
{
  "mode": "auto",
  "reason": "محاسبه خودکار جریمه"
}
```

### Preview Response

```json
{
  "overdueDays": 5,
  "graceDays": 2,
  "chargeableDays": 3,
  "calculatedPenaltyRial": "150000",
  "cappedByMax": false
}
```

### Apply effect

- Insert `InstallmentAdjustment` PENALTY
- `installment.amountRial += penaltyAmount` (bigint)
- Operation log entry

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` — InstallmentAdjustment |
| Create | `packages/domain/src/installments/penalty-calculator.service.ts` |
| Create | `packages/application/installments/apply-penalty.use-case.ts` |
| Create | `packages/contracts/src/installments/penalty.schema.ts` |
| Update | `apps/api/src/modules/installments/installment-adjustments.controller.ts` |
| Create | `packages/application/installments/apply-penalty.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Migration InstallmentAdjustment
2. Penalty calculator (pure domain, Tehran dates)
3. Preview + apply use cases
4. Controller
5. Tests with settings fixtures

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Not overdue | 409 | `INSTALLMENT_NOT_OVERDUE` |
| Penalty exceeds max | 400 | `PENALTY_MAX_EXCEEDED` |
| Paid/waived | 409 | `INSTALLMENT_STATUS_INVALID` |
| Duplicate auto same day | 409 | `PENALTY_ALREADY_APPLIED_TODAY` |

---

## تست

- [ ] Unit: penalty calc with grace days
- [ ] Unit: max cap applied
- [ ] Integration: apply increases amountRial
- [ ] RBAC deny

---

## UX

N/A — preview + apply در IFP-099.

---

## Flow

```
قسط overdue → جریمه → preview محاسبه → تأیید → amount به‌روز
```

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] Settings schema only
- [ ] Audit installment.penalty
- [ ] SOFT-DELETE — reversal via reversedAt

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت جریمه
- IFP Phase-04 penalty settings

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | preview + apply |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
