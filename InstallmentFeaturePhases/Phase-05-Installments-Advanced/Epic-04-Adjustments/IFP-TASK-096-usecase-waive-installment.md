# IFP-TASK-096: Use Case + API — بخشودگی قسط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-04-Adjustments |
| ID | IFP-TASK-096 |
| Priority | P0 |
| Depends on | IFP-TASK-079, Phase-1 TASK-066 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 5h |

---

## هدف

**بخشودگی (waive)** قسط — انتقال به وضعیت terminal `waived` با `waiveReason` و `waivedByStaffId` — بدون حذف فیزیکی؛ audit `installment.waive`.

---

## معیار پذیرش

- [ ] `WaiveInstallmentUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/waive`
- [ ] Permission: `installments.installment.waive`
- [ ] Only `pending`/`overdue` → `waived`
- [ ] `paid` → `409 INSTALLMENT_ALREADY_PAID`
- [ ] `waiveReason` ۳–۵۰۰ chars required
- [ ] Pending payment attempts on installment → auto-reject or block with message
- [ ] Audit: `installment.waive`
- [ ] Sale `remainingRial` recalculated

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/waive
Permission: installments.installment.waive
```

### Request

```json
{
  "waiveReason": "توافق مدیریت — بخشودگی قسط آخر",
  "expectedVersion": 2,
  "rejectPendingPayments": true
}
```

### Response `200`

```json
{
  "installment": {
    "id": "uuid",
    "status": "waived",
    "waiveReason": "...",
    "waivedByStaffId": "uuid",
    "version": 3
  },
  "rejectedPaymentAttemptIds": ["uuid"]
}
```

### Domain

```typescript
installment.waive(staffId, reason, at);
// raises InstallmentWaivedEvent
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/waive-installment.use-case.ts` |
| Create | `packages/contracts/src/installments/waive-installment.schema.ts` |
| Update | `packages/domain/src/installments/installment.entity.ts` |
| Create | `apps/api/src/modules/installments/installment-adjustments.controller.ts` |
| Create | `packages/application/installments/waive-installment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Domain waive method
2. Use case — handle pending payments
3. Sale totals update
4. Controller + audit
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Already paid | 409 | `INSTALLMENT_ALREADY_PAID` |
| Already waived | 409 | `INSTALLMENT_ALREADY_WAIVED` |
| Pending payments + reject=false | 409 | `PENDING_PAYMENTS_EXIST` |
| Version conflict | 409 | `VERSION_CONFLICT` |

---

## تست

- [ ] Integration: waive pending → waived
- [ ] Integration: waive paid → 409
- [ ] RBAC: waive permission
- [ ] Audit log entry

---

## UX

N/A — دکمه بخشودگی با modal دلیل در IFP-099.

---

## Flow

```
جزئیات قسط → بخشودگی → دلیل → تأیید هشدار
→ status waived (خاکستری)
```

---

## Policy Alignment

- [ ] SOFT-DELETE — waive ≠ delete
- [ ] Terminal status — no undo without admin ADR
- [ ] Audit installment.waive
- [ ] ADR-015 scope

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت بخشودگی
- `docs/03-modules/installments/BUSINESS-RULES.md`

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
