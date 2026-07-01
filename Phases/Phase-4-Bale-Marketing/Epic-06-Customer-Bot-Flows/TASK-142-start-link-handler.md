# TASK-142: /start Link Handler

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-06-Customer-Bot-Flows |
| ID | TASK-142 |
| Priority | P0 |
| Depends on | TASK-135, TASK-137, TASK-140 |
| Blocks | TASK-143, TASK-169 |
| Estimated | 5h |

---

## هدف

Handler برای `/start link_{token}` — delegate به `LinkBotIdentityUseCase` و پیام خوش‌آمد.

---

## معیار پذیرش

- [ ] Handler registered in CommandRouter
- [ ] Extract token from `link_{token}` payload
- [ ] Call LinkBotIdentityUseCase
- [ ] Send welcome template on success
- [ ] Error templates: expired, used, invalid
- [ ] No business logic in handler

---

## مشخصات فنی

### Command parse

```typescript
const match = text.match(/^\/start link_(.+)$/);
if (!match) return next();
const token = match[1];
const result = await linkBotIdentityUseCase.execute({ token, chatId, baleUser });
```

### Messages

| Result | Template key |
|--------|--------------|
| Success | `customer.bot.welcome` |
| Expired | `customer.bot.link_expired` |
| Used | `customer.bot.link_used` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/handlers/start-link.handler.ts` |
| Create | `apps/bot-gateway/src/bale/handlers/start-link.handler.spec.ts` |
| Update | `apps/bot-gateway/src/bale/command-router.ts` |

---

## مراحل پیاده‌سازی

1. Handler implementation
2. Wire use case
3. Templates
4. Register route
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid token format | — | help message |
| Bale user is_bot | — | ignore |
| Use case throws | — | generic error template |

---

## تست

- [ ] Unit: parses link_ prefix
- [ ] Unit: calls use case
- [ ] Integration: welcome sent

---

## Flow (if applicable)

`/start link_{token}` → LinkBotIdentityUseCase → Welcome
         ↘ expired/used → Error template

---

## Policy Alignment

- [ ] Thin handler → use case
- [ ] No financial logic in handler

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
