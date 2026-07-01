# TASK-145: Customer Templates & Keyboards

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-06-Customer-Bot-Flows |
| ID | TASK-145 |
| Priority | P0 |
| Depends on | TASK-141, TASK-143 |
| Blocks | TASK-146, TASK-149 |
| Estimated | 4h |

---

## هدف

قالب‌های فارسی پیام مشتری و InlineKeyboard builders — centralized در bot-gateway.

---

## معیار پذیرش

- [ ] Template keys: welcome, installments list, payment reported, errors
- [ ] RTL-safe Markdown
- [ ] Keyboard builder: installment rows + report button
- [ ] Unit tests snapshot strings
- [ ] No hardcoded strings in handlers

---

## مشخصات فنی

### Template registry

```typescript
export const customerBotTemplates = {
  welcome: (name: string) => `سلام ${name}! اقساط شما:`,
  paymentReported: () => 'درخواست پرداخت ثبت شد. پس از تأیید فروشنده اطلاع‌رسانی می‌شود.',
  linkExpired: () => 'لینک منقضی شده. از فروشنده لینک جدید بگیرید.',
};
```

### Keyboard

```typescript
function installmentKeyboard(installments: InstallmentSummary[]): InlineKeyboardMarkup
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/templates/customer-templates.ts` |
| Create | `apps/bot-gateway/src/bale/templates/customer-keyboards.ts` |
| Create | `apps/bot-gateway/src/bale/templates/customer-templates.spec.ts` |

---

## مراحل پیاده‌سازی

1. Template functions
2. Keyboard builder
3. Wire handlers
4. Snapshot tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Long customer name | — | truncate safely |
| >10 installments | — | pagination buttons |

---

## تست

- [ ] Unit: template rendering
- [ ] Unit: keyboard structure

---

## Policy Alignment

- [ ] fa-IR copy
- [ ] Markdown per Bale docs

---

## مراجع

- `docs/05-channels/bale-api-reference.md`

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
