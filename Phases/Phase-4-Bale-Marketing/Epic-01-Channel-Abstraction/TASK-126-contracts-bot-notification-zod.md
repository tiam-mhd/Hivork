# TASK-126: Contracts — Bot & Notification Zod

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-01-Channel-Abstraction |
| ID | TASK-126 |
| Priority | P0 |
| Depends on | TASK-124, TASK-125 |
| Blocks | TASK-134, TASK-137, TASK-138 |
| Estimated | 5h |

---

## هدف

Zod schemas برای bot link API، Bale webhook Update، و notification DTOs — هم‌تراز API tasks.

---

## معیار پذیرش

- [ ] `link-token.schema.ts` request/response
- [ ] `bale-update.schema.ts` — message + callback_query
- [ ] `notification-log.schema.ts` list/detail
- [ ] `User.id` coerce to string
- [ ] Contract unit tests pass

---

## مشخصات فنی

### generateBotLinkToken
```typescript
export const generateBotLinkTokenRequestSchema = z.object({
  tenantCustomerId: z.string().uuid(),
  platform: z.enum(['bale', 'telegram']).default('bale'),
});
export const generateBotLinkTokenResponseSchema = z.object({
  token: z.string().min(16).max(48),
  deepLink: z.string().url(),
  expiresAt: z.string().datetime(),
});
```

### baleUpdateSchema (subset)
```typescript
const baleIdSchema = z.union([z.number(), z.string()]).transform(String);
export const baleUserSchema = z.object({
  id: baleIdSchema,
  first_name: z.string(),
  username: z.string().optional(),
  is_bot: z.boolean().optional(),
});
```

### NotificationLogStatus
`scheduled | sent | failed | skipped`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/bot/link-token.schema.ts` |
| Create | `packages/contracts/src/bot/bale-update.schema.ts` |
| Create | `packages/contracts/src/notifications/notification-log.schema.ts` |
| Update | `packages/contracts/src/index.ts` |

---

## مراحل پیاده‌سازی

1. Link-token schemas + deep link URL pattern
2. Bale update — coerce User.id to string
3. Notification log DTOs
4. Unit tests valid/invalid samples

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid UUID | 400 VALIDATION_ERROR | Zod fail |
| Empty update | — | schema reject |

---

## تست

- [ ] Unit: link-token roundtrip
- [ ] Unit: bale update samples
- [ ] Unit: bigint as string in examples

---

## Policy Alignment

- [ ] EXCELLENCE §8 on DTOs
- [ ] ADR-016 /api/v1
- [ ] ADR-018 channel codes

---

## مراجع

- `docs/05-channels/bale-api-reference.md`
- `packages/contracts/`

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
