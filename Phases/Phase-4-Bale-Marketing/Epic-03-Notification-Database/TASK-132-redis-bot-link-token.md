# TASK-132: Redis — BotLinkToken Store

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-03-Notification-Database |
| ID | TASK-132 |
| Priority | P0 |
| Depends on | TASK-126 |
| Blocks | TASK-133, TASK-134 |
| Estimated | 3h |

---

## هدف

ذخیره one-time token لینک بازو در Redis — TTL 72h، atomic consume.

---

## معیار پذیرش

- [ ] `BotLinkTokenStore` — set/get/consume
- [ ] Key pattern: `bot:link:{token}`
- [ ] Payload: tenantId, tenantCustomerId|staffId, platform, createdById
- [ ] TTL 72 hours
- [ ] consume = GET + DEL atomic (Lua or multi)
- [ ] Unit tests با ioredis-mock

---

## مشخصات فنی

### Redis key

```
bot:link:{token}  → JSON { tenantId, targetType, targetId, platform, createdById, expiresAt }
TTL: 259200 (72h)
```

### consume (one-time)

```typescript
async consume(token: string): Promise<BotLinkPayload | null> {
  // Atomic: return payload and delete key
}
```

### Token generation

32-byte crypto random → base64url → 43 chars

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/cache/bot-link-token.store.ts` |
| Create | `packages/infrastructure/cache/bot-link-token.store.spec.ts` |
| Update | `packages/infrastructure/cache/index.ts` |

---

## مراحل پیاده‌سازی

1. Implement store interface
2. Atomic consume
3. TTL on set
4. Unit tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Expired token | — | consume → null |
| Double consume | — | second → null |
| Invalid token format | — | null without error |

---

## تست

- [ ] Unit: set/get/consume
- [ ] Unit: TTL expiry

---

## Policy Alignment

- [ ] Ephemeral Redis — exception to soft-delete policy
- [ ] No PII in key name

---

## مراجع

- `docs/05-channels/bale-api-reference.md`
- `Phases/Phase-4-Bale-Marketing/Epic-04-Bot-Link-API/README.md`

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
