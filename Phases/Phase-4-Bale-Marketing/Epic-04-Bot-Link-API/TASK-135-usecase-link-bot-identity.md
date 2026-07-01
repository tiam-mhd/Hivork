# TASK-135: Use Case — LinkBotIdentity

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-04-Bot-Link-API |
| ID | TASK-135 |
| Priority | P0 |
| Depends on | TASK-133, TASK-134 |
| Blocks | TASK-136, TASK-142 |
| Estimated | 6h |

---

## هدف

Use case مصرف token و اتصال `BotIdentity` مشتری — `/start link_{token}` در bot-gateway.

---

## معیار پذیرش

- [ ] `LinkBotIdentityUseCase` — consume Redis token
- [ ] Upsert `BotIdentity` (existing TASK-022 model) با bale chatId string
- [ ] Idempotent re-link same customer+chat
- [ ] Audit: `bot.identity.link`
- [ ] Emit domain event `customer.bot_linked`

---

## مشخصات فنی

### Flow

```
token from /start link_{token}
  → Redis consume (one-time)
  → validate tenantCustomer
  → upsert BotIdentity { platform: bale, chatId: string, globalCustomerId }
  → welcome message context returned
```

### BotIdentity fields

| Field | Value |
|-------|-------|
| `platform` | `bale` |
| `chatId` | `User.id` as string |
| `globalCustomerId` | from TenantCustomer |

### Token reuse

Second `/start` with same consumed token → friendly error message key

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/bot/link-bot-identity.use-case.ts` |
| Create | `packages/application/bot/link-bot-identity.use-case.spec.ts` |
| Update | `packages/application/bot/index.ts` |

---

## مراحل پیاده‌سازی

1. Implement consume + upsert
2. Domain event + audit
3. Unit tests
4. Export

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Expired token | — | BOT_LINK_TOKEN_EXPIRED message |
| Already consumed | — | BOT_LINK_TOKEN_USED |
| chatId already linked other customer | 409 | reject |

---

## تست

- [ ] Unit: happy path link
- [ ] Unit: expired token
- [ ] Integration: BotIdentity persisted

---

## Flow (if applicable)

`/start link_{token}` → consume Redis → upsert BotIdentity → Success
         ↘ expired/used → Error message → /help

---

## Policy Alignment

- [ ] SOFT-DELETE on BotIdentity
- [ ] Audit bot.identity.link
- [ ] No logic in bot handler

---

## مراجع

- `docs/03-modules/installments/CUSTOMER-FLOWS.md`
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
