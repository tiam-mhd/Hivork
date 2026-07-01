# TASK-143: List Installments (Bot)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-06-Customer-Bot-Flows |
| ID | TASK-143 |
| Priority | P0 |
| Depends on | TASK-142, TASK-075 |
| Blocks | TASK-144, TASK-145 |
| Estimated | 6h |

---

## هدف

نمایش اقساط مشتری در بازو — reuse `ListInstallmentsUseCase` با actor=customer و فیلتر tenantCustomer.

---

## معیار پذیرش

- [ ] Handler `/installments` + auto after link
- [ ] Reuse ListInstallmentsUseCase — customer scope via BotIdentity
- [ ] Format amounts bigint → Persian Rial string
- [ ] Inline keyboard: report payment per installment
- [ ] Paginate if >5 installments
- [ ] Markdown per bale-api-reference

---

## مشخصات فنی

### Customer context resolution

```typescript
const identity = await botIdentityRepo.findByChatId('bale', chatId);
const installments = await listInstallmentsUseCase.execute({
  tenantId: identity.tenantId,
  tenantCustomerId: identity.tenantCustomerId,
  status: ['pending', 'overdue'],
  limit: 10,
});
```

### Display format

```
قسط ۲ از ۶ — ۱٬۵۰۰٬۰۰۰ ریال — سررسید: ۱۴۰۴/۰۴/۱۵
[پرداخت کردم] (callback)
```

### Money

bigint → formatted string — never number/float

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/handlers/list-installments.handler.ts` |
| Create | `packages/application/bot/list-customer-installments-bot.use-case.ts` |
| Create | `apps/bot-gateway/src/bale/handlers/list-installments.handler.spec.ts` |

---

## مراحل پیاده‌سازی

1. Bot use case wrapping ListInstallments
2. Formatter + keyboard builder
3. Handler
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No linked identity | — | prompt /start link_ |
| No installments | — | empty state template |
| Soft-deleted installment | — | excluded |

---

## تست

- [ ] Unit: format installment row
- [ ] Integration: lists customer installments only

---

## Policy Alignment

- [ ] Reuse TASK-075 — no duplicate query logic
- [ ] bigint money
- [ ] Customer actor scope

---

## مراجع

- `Phases/Phase-1-Seller-Panel/Epic-05-Installments-Use-Cases/TASK-075-usecase-list-installments.md`

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
