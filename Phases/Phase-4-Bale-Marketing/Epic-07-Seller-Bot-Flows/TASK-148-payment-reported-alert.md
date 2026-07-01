# TASK-148: Payment Reported Alert

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-07-Seller-Bot-Flows |
| ID | TASK-148 |
| Priority | P0 |
| Depends on | TASK-144, TASK-146 |
| Blocks | TASK-174 |
| Estimated | 4h |

---

## هدف

هشدار بله به فروشنده وقتی مشتری «پرداخت کردم» می‌زند.

---

## معیار پذیرش

- [ ] Event handler `payment.reported` → SendPaymentReportedAlertUseCase
- [ ] Bale message to linked staff with customer name + amount + panel link
- [ ] Respect staff notification preferences
- [ ] NotificationLog + idempotency per attemptId

---

## مشخصات فنی

### Event payload

```typescript
{ tenantId, installmentId, paymentAttemptId, tenantCustomerId, amountRial: bigint }
```

### Message

```
مشتری {name} پرداخت قسط {n} را گزارش کرد — {amount} ریال
بررسی: /admin/payments/pending
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/notifications/send-payment-reported-alert.use-case.ts` |
| Create | `packages/application/notifications/handlers/payment-reported.handler.ts` |

---

## مراحل پیاده‌سازی

1. Use case
2. Event handler registration
3. Bale send
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Staff not linked | — | fallback panel notification only |
| Duplicate event | — | idempotent skip |

---

## تست

- [ ] Unit: formats alert
- [ ] Integration: event → Bale mock send

---

## Policy Alignment

- [ ] Event-driven — no direct import across modules
- [ ] bigint money

---

## مراجع

- `docs/03-modules/installments/CUSTOMER-FLOWS.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
