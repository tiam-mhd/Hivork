# TASK-134: Use Case — GenerateBotLinkToken

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-04-Bot-Link-API |
| ID | TASK-134 |
| Priority | P0 |
| Depends on | TASK-132, TASK-133 |
| Blocks | TASK-135, TASK-137 |
| Estimated | 5h |

---

## هدف

Use case تولید token یکبارمصرف و deep link بله برای مشتری — `https://ble.ir/{username}?start=link_{token}`.

---

## معیار پذیرش

- [ ] `GenerateBotLinkTokenUseCase` در application layer
- [ ] Permission: `installments.customer.link_bot`
- [ ] Validate tenantCustomer belongs to tenant
- [ ] Store token in Redis via BotLinkTokenStore
- [ ] Return deepLink + expiresAt
- [ ] Audit: `bot.link_token.create`

---

## مشخصات فنی

### Input / Output

```typescript
type GenerateBotLinkTokenInput = {
  tenantId: string;
  actorId: string;
  tenantCustomerId: string;
  platform: 'bale' | 'telegram';
};

type GenerateBotLinkTokenOutput = {
  token: string;
  deepLink: string;  // https://ble.ir/{BALE_BOT_USERNAME}?start=link_{token}
  expiresAt: Date;
};
```

### Deep link format

```
https://ble.ir/{username}?start=link_{token}
```

### Business rules

- Customer must exist and not soft-deleted
- Token one-time — consumed in LinkBotIdentity (TASK-135)
- No business logic in controller

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/bot/generate-bot-link-token.use-case.ts` |
| Create | `packages/application/bot/generate-bot-link-token.use-case.spec.ts` |
| Update | `packages/application/bot/index.ts` |

---

## مراحل پیاده‌سازی

1. Implement use case
2. Wire repos + audit
3. Unit tests happy/edge paths
4. Export

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Customer not found | 404 CUSTOMER_NOT_FOUND | fail |
| Cross-tenant customer | 404 | no leak |
| Missing permission | 403 | RBAC deny |

---

## تست

- [ ] Unit: generates token + deep link
- [ ] Unit: audit called
- [ ] Integration: Redis TTL

---

## Policy Alignment

- [ ] RBAC installments.customer.link_bot
- [ ] Audit mandatory
- [ ] Application layer only

---

## مراجع

- `docs/05-channels/bale-api-reference.md`
- `packages/contracts/src/bot/link-token.schema.ts`

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
