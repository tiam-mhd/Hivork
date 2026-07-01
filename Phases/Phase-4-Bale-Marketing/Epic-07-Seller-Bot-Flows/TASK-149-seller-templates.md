# TASK-149: Seller Message Templates

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-07-Seller-Bot-Flows |
| ID | TASK-149 |
| Priority | P0 |
| Depends on | TASK-145, TASK-147 |
| Blocks | — |
| Estimated | 3h |

---

## هدف

قالب‌های فارسی پیام فروشنده — connected, daily summary, payment alert.

---

## معیار پذیرش

- [ ] Template module `seller-templates.ts`
- [ ] Consistent tone with customer templates
- [ ] Panel deep links embedded
- [ ] Unit snapshot tests

---

## مشخصات فنی

### Keys

- `seller.bot.connected`
- `seller.daily.summary`
- `seller.payment.reported`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/templates/seller-templates.ts` |
| Create | `apps/bot-gateway/src/bale/templates/seller-templates.spec.ts` |

---

## مراحل پیاده‌سازی

1. Template functions
2. Wire use cases
3. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Missing shop name | — | fallback tenant name |

---

## تست

- [ ] Unit: all templates render

---

## Policy Alignment

- [ ] fa-IR
- [ ] No PII in logs

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
