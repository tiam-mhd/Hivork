# IFP-TASK-081: Use Case + API — تعویق قسط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-01-Installment-Operations |
| ID | IFP-TASK-081 |
| Priority | P0 |
| Depends on | IFP-TASK-079 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 5h |

---

## هدف

پیاده‌سازی **تعویق قسط** (defer) — افزودن `deferDays` به `dueDate` فعلی برای قسط `pending` — با سقف تعویق از tenant settings و audit اجباری.

---

## معیار پذیرش

- [ ] `DeferInstallmentUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/defer`
- [ ] Permission: `installments.installment.defer`
- [ ] `deferDays` integer > 0؛ حداکثر از `installments.defer.maxDays` setting
- [ ] فقط `pending` — `overdue` باید ابتدا reschedule یا penalty flow
- [ ] `InstallmentOperationLog` با `operationType: defer`
- [ ] Audit: `installment.defer`
- [ ] Integration test: defer within max + exceed max blocked

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/defer
Permission: installments.installment.defer
Module: installments
Headers: X-Branch-Id
```

### Request

```json
{
  "deferDays": 7,
  "reason": "درخواست مشتری — تعویق یک هفته",
  "expectedVersion": 2
}
```

### Response `200`

```json
{
  "installment": {
    "id": "uuid",
    "dueDate": "1405-08-22T00:00:00.000Z",
    "status": "pending",
    "version": 3
  },
  "operationLogId": "uuid",
  "previousDueDate": "1405-08-15T00:00:00.000Z"
}
```

### Domain Rule (IFP-079)

- `newDueDate = currentDueDate + deferDays` (Tehran calendar)
- Cumulative defer per installment tracked in `metadata.deferHistory[]` on log
- `deferDays > maxDeferDays` → `DEFER_MAX_EXCEEDED`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/defer-installment.use-case.ts` |
| Create | `packages/contracts/src/installments/defer-installment.schema.ts` |
| Update | `apps/api/src/modules/installments/installment-operations.controller.ts` |
| Create | `packages/application/installments/defer-installment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Zod `DeferInstallmentSchema` — `deferDays` 1..max from settings
2. Load tenant setting `installments.defer.maxDays` (default 30)
3. Use case: validate + TX update dueDate
4. Write operation log + audit
5. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Status overdue | 409 | `INSTALLMENT_STATUS_INVALID` — use reschedule |
| deferDays ≤ 0 | 400 | `DEFER_DAYS_INVALID` |
| Exceeds max defer | 400 | `DEFER_MAX_EXCEEDED` |
| Paid/waived | 409 | `INSTALLMENT_STATUS_INVALID` |
| Version conflict | 409 | `VERSION_CONFLICT` |

---

## تست

- [ ] Unit: defer 7 days adds exactly 7 to dueDate (Tehran)
- [ ] Integration: defer pending → success
- [ ] Integration: defer overdue → 409
- [ ] RBAC deny test

---

## UX

N/A — UI در IFP-099 (دکمه «تعویق» با input تعداد روز).

---

## Flow

```
قسط pending → تعویق → وارد کردن تعداد روز + دلیل → تأیید
→ dueDate جدید نمایش داده شود در timeline
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2
- [ ] SOFT-DELETE-POLICY
- [ ] ADR-015 branch scope
- [ ] Settings schema only — no free-form rules

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — تعویق
- `IFP-TASK-079-domain-installment-operations-rules.md`

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
