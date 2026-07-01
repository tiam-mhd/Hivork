# TASK-144: Report Payment Callback

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-06-Customer-Bot-Flows |
| ID | TASK-144 |
| Priority | P0 |
| Depends on | TASK-143, TASK-141 |
| Blocks | TASK-148 |
| Estimated | 6h |

---

## هدف

Callback «پرداخت کردم» — ایجاد `PaymentAttempt` pending (ADR-008) — نه auto-paid.

---

## معیار پذیرش

- [ ] Callback `report_payment:{installmentId}`
- [ ] `ReportPaymentFromBotUseCase` → PaymentAttempt pending
- [ ] Always `answerCallbackQuery` با toast تأیید
- [ ] Idempotent double-tap → same attempt or friendly message
- [ ] Emit event for seller alert (TASK-148)

---

## مشخصات فنی

### Use case

```typescript
type ReportPaymentInput = {
  tenantId: string;
  tenantCustomerId: string;
  installmentId: string;
  reportedVia: 'bale';
  baleChatId: string;
};
// Creates PaymentAttempt status=pending — staff confirms in panel
```

### Callback flow

```
User taps [پرداخت کردم]
  → answerCallbackQuery('درخواست ثبت شد — فروشنده بررسی می‌کند')
  → ReportPaymentFromBotUseCase
  → emit payment.reported event
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/report-payment-from-bot.use-case.ts` |
| Create | `apps/bot-gateway/src/bale/handlers/report-payment.handler.ts` |
| Create | `packages/application/installments/report-payment-from-bot.use-case.spec.ts` |

---

## مراحل پیاده‌سازی

1. Use case — PaymentAttempt pending
2. Handler + answerCallback
3. Domain event
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Installment not owned | 404 | silent toast error |
| Already paid | 409 | already paid message |
| Duplicate pending attempt | — | idempotent OK |

---

## تست

- [ ] Unit: creates pending attempt
- [ ] Unit: answerCallback called
- [ ] Integration: no auto-paid

---

## Flow (if applicable)

Tap [پرداخت کردم] → answerCallback → PaymentAttempt pending → Seller panel confirm

---

## Policy Alignment

- [ ] ADR-008 PaymentAttempt
- [ ] Audit payment.report
- [ ] bigint amounts

---

## مراجع

- `docs/03-modules/installments/state-machines.md`

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
