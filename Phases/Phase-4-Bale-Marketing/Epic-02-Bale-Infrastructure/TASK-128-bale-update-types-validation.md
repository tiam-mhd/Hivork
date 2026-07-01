# TASK-128: Bale Update Types & Zod Validation

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-02-Bale-Infrastructure |
| ID | TASK-128 |
| Priority | P0 |
| Depends on | TASK-127 |
| Blocks | TASK-138 |
| Estimated | 4h |

---

## هدف

اعتبارسنجی runtime برای Update ورودی webhook — message، callback_query؛ `User.id` coerce به string.

---

## معیار پذیرش

- [ ] `baleUpdateSchema` در infrastructure (reuse contracts TASK-126)
- [ ] Parse `update_id`, `message`, `callback_query` — mutually exclusive
- [ ] `edited_message` → reject/ignore v1
- [ ] Vitest با نمونه‌های واقعی Bale JSON
- [ ] Type exports برای bot-gateway

---

## مشخصات فنی

### Update schema (subset)

```typescript
export const baleUpdateSchema = z.object({
  update_id: z.number().int().positive(),
  message: baleMessageSchema.optional(),
  callback_query: baleCallbackQuerySchema.optional(),
}).refine(u => !!(u.message) !== !!(u.callback_query) || (!u.message && !u.callback_query), {
  message: 'At most one of message or callback_query',
});
```

### User.id coercion

```typescript
const baleIdSchema = z.union([z.number(), z.string()]).transform(String);
// Store baleChatId as string — may exceed 2^31
```

### CallbackQuery notes

| فیلد | Hivork |
|------|--------|
| `id` | string — if starts with `1` → legacy client |
| `data` | `report_payment:{installmentId}` etc. |
| `from.id` | string |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/notifications/bale-update.parser.ts` |
| Create | `packages/infrastructure/notifications/bale-update.parser.spec.ts` |
| Update | `packages/contracts/src/bot/bale-update.schema.ts` |

---

## مراحل پیاده‌سازی

1. Align Zod با contracts TASK-126
2. Parser function `parseBaleUpdate(raw: unknown)`
3. Reject invalid / empty updates
4. Sample fixtures from bale-api-reference

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Both message+callback | — | schema reject |
| edited_message only | — | ignore — return null |
| User.id > 2^31 | — | stored as string |

---

## تست

- [ ] Unit: valid message update
- [ ] Unit: callback_query
- [ ] Unit: bigint id coercion

---

## Policy Alignment

- [ ] ADR-018 contracts alignment
- [ ] No business logic in parser

---

## مراجع

- `docs/05-channels/bale-api-reference.md`
- `packages/contracts/src/bot/bale-update.schema.ts`

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
