# IFP-TASK-082: Use Case + API — تعجیل قسط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-01-Installment-Operations |
| ID | IFP-TASK-082 |
| Priority | P0 |
| Depends on | IFP-TASK-079 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 5h |

---

## هدف

پیاده‌سازی **تعجیل قسط** (accelerate) — جابجایی `dueDate` به تاریخ زودتر (≤ تاریخ فعلی) برای قسط‌های `pending` یا `overdue` — جهت وصول زودهنگام یا بستن معوقات.

---

## معیار پذیرش

- [ ] `AccelerateInstallmentUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/accelerate`
- [ ] Permission: `installments.installment.accelerate`
- [ ] `newDueDate` ≤ current `dueDate` و ≥ today (Tehran) unless setting allows immediate overdue collection
- [ ] Overdue → accelerate may set `status` back to `pending` if new dueDate ≥ today
- [ ] Operation log + audit `installment.accelerate`
- [ ] Integration tests

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/accelerate
Permission: installments.installment.accelerate
```

### Request

```json
{
  "newDueDate": "1405-07-01",
  "reason": "مشتری درخواست پرداخت زودتر داد",
  "expectedVersion": 1
}
```

### Status Transition

| Before | newDueDate vs today | After status |
|--------|---------------------|--------------|
| overdue | ≥ today | pending |
| overdue | < today | overdue (unchanged) |
| pending | any valid | pending |

### Use Case

```typescript
// InstallmentOperationsService.validateAccelerate(installment, newDueDate, settings)
// TX: update dueDate, optionally status, version++, log, audit
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/accelerate-installment.use-case.ts` |
| Create | `packages/contracts/src/installments/accelerate-installment.schema.ts` |
| Update | `apps/api/src/modules/installments/installment-operations.controller.ts` |
| Create | `packages/application/installments/accelerate-installment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Contract schema
2. Domain validation via IFP-079
3. Status recalculation helper (overdue → pending edge)
4. Use case + controller
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| newDueDate > current dueDate | 400 | `DUE_DATE_INVALID` |
| Paid/waived | 409 | `INSTALLMENT_STATUS_INVALID` |
| newDueDate in far past | 400 | `DUE_DATE_TOO_OLD` |
| Version conflict | 409 | `VERSION_CONFLICT` |

---

## تست

- [ ] Unit: overdue + future newDueDate → pending
- [ ] Integration: accelerate pending installment
- [ ] Integration: invalid future date → 400

---

## UX

N/A — IFP-099.

---

## Flow

```
جزئیات قسط → تعجیل → انتخاب تاریخ جدید (date picker max=سررسید فعلی)
→ confirm → لیست اقساط به‌روز
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2
- [ ] SOFT-DELETE-POLICY
- [ ] ADR-008 state machine
- [ ] ADR-015 scope

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — تعجیل
- `docs/03-modules/installments/state-machines.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
