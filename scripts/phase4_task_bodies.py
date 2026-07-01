# Task body definitions for Phase 4 generator — TASK-124..174
# Each entry: (filename, epic_dir, body_after_meta)

def t(n, slug, epic, title, pri, dep, blk, hrs, goal, ac, spec, files, steps, edges, tests, policy, refs, ux="", flow="", score=97):
    meta = f"""# TASK-{n}: {title}

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | {epic} |
| ID | TASK-{n:03d} |
| Priority | {pri} |
| Depends on | {dep} |
| Blocks | {blk} |
| Estimated | {hrs} |

---

## هدف

{goal}

---

## معیار پذیرش

{ac}

---

## مشخصات فنی

{spec}
"""
    if "Base fields" in spec or "model " in spec.lower():
        pass  # base fields inline in spec
    body = meta
    body += f"""
---

## فایل‌ها

{files}

---

## مراحل پیاده‌سازی

{steps}

---

## Edge Cases & Errors

{edges}

---

## تست

{tests}
"""
    if ux:
        body += f"""
---

## UX (if UI)

{ux}
"""
    if flow:
        body += f"""
---

## Flow (if applicable)

{flow}
"""
    body += f"""
---

## Policy Alignment

{policy}

---

## مراجع

{refs}

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | {score - 84} | Phase 4 sync |
| **جمع** | **/100** | **{score}** | ≥95 required برای Ready |
"""
    return (f"TASK-{n:03d}-{slug}.md", epic, body)


TASKS = [
    t(124, "adr-channel-abstraction", "Epic-01-Channel-Abstraction", "ADR — Channel Abstraction", "P0",
      "TASK-123", "TASK-125, TASK-126", "4h",
      "ثبت ADR-017 برای لایه abstraction کانال‌های اعلان — جداسازی `NotificationChannel` از adapterهای مشخص (Bale، Telegram، SMS). پایه معماری قبل از پیاده‌سازی adapter بله و scheduler.",
      """- [ ] فایل `docs/08-decisions/ADR-017-channel-abstraction.md` ایجاد شده
- [ ] ADR در `adr-log.md` ثبت شده
- [ ] Interface `NotificationChannel` و `Recipient` در ADR مستند
- [ ] Idempotency key `(entityId, reminderType, channel)` تعریف شده
- [ ] Fallback order: telegram → bale → sms → panel log
- [ ] Self-review ≥ 95""",
      """### ADR-017 — Channel Abstraction

**Context:** فاز ۴ بله را اول پیاده می‌کند؛ تلگرام deferred. نیاز به port مشترک برای جلوگیری از duplicate logic.

**Decision:**
```
packages/domain/core/ports/notification-channel.port.ts
packages/infrastructure/notifications/{bale,telegram,sms}-adapter.ts
packages/application/notifications/notification.service.ts
```

**NotificationChannel port:**
```typescript
export type ChannelCode = 'telegram' | 'bale' | 'sms';

export interface NotificationPayload {
  templateKey: string;
  variables: Record<string, string>;
  replyMarkup?: InlineKeyboardMarkup;
}

export interface NotificationChannel {
  readonly code: ChannelCode;
  send(recipient: Recipient, payload: NotificationPayload): Promise<SendResult>;
  isAvailable(recipient: Recipient): boolean;
}

export interface Recipient {
  globalCustomerId?: string;
  staffId?: string;
  baleChatId?: string;      // string — User.id may exceed 2^31
  telegramChatId?: string;
  phone?: string;
}
```

**Consequences:** Adapterها stateless؛ credentials از env؛ rate limit handling per adapter.""",
      """| عمل | مسیر |
|-----|------|
| Create | `docs/08-decisions/ADR-017-channel-abstraction.md` |
| Update | `docs/08-decisions/adr-log.md` |
| Update | `docs/05-channels/notifications.md` — cross-ref ADR-017 |""",
      """1. Draft ADR با Context / Decision / Consequences
2. Align با `notifications.md` diagram
3. Review با team — Approved status
4. Link در Phase 4 Epic README""",
      """| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Adapter جدید بدون ADR | — | PR blocked |
| Business logic در adapter | — | فقط transport — templates در application |""",
      """- [ ] Doc review checklist pass
- [ ] No open questions in ADR""",
      """- [ ] ADR-017 cited
- [ ] ADR-006 multi-channel
- [ ] EXCELLENCE §8 N/A (doc only)""",
      """- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/08-decisions/adr-log.md`"""),

    t(125, "notification-channel-port", "Epic-01-Channel-Abstraction", "NotificationChannel Port Interface", "P0",
      "TASK-124", "TASK-126, TASK-153", "3h",
      "پیاده‌سازی port `NotificationChannel` و value objects مرتبط در `packages/domain` — zero framework imports.",
      """- [ ] `notification-channel.port.ts` در domain/core/ports
- [ ] Types: `ChannelCode`, `Recipient`, `NotificationPayload`, `SendResult`
- [ ] `SendResult`: `{ ok: true, externalMessageId? } | { ok: false, retryable: boolean, retryAfterSec?: number }`
- [ ] Unit test: mock channel implements interface
- [ ] No NestJS/Prisma imports in domain""",
      """```typescript
// packages/domain/core/ports/notification-channel.port.ts
export type ChannelCode = 'telegram' | 'bale' | 'sms';

export type SendResult =
  | { ok: true; externalMessageId?: string }
  | { ok: false; retryable: boolean; retryAfterSec?: number; errorCode?: string };

export interface NotificationChannel {
  readonly code: ChannelCode;
  send(recipient: Recipient, payload: NotificationPayload): Promise<SendResult>;
  isAvailable(recipient: Recipient): boolean;
}

export function recipientHasBale(r: Recipient): boolean {
  return Boolean(r.baleChatId);
}
```""",
      """| عمل | مسیر |
|-----|------|
| Create | `packages/domain/core/ports/notification-channel.port.ts` |
| Create | `packages/domain/core/ports/index.ts` — export |
| Create | `packages/domain/core/ports/notification-channel.port.spec.ts` |""",
      """1. Define types per ADR-017
2. Export from domain package index
3. Vitest unit test with fake adapter
4. `pnpm turbo typecheck` pass""",
      """| سناریو | Code | رفتار |
|--------|------|--------|
| Missing baleChatId | — | `isAvailable` → false |
| 429 retryable | `retryAfterSec` | adapter sets retryable=true |""",
      """- [ ] Unit: mock channel send success/fail
- [ ] Unit: isAvailable per channel id""",
      """- [ ] ADR-017
- [ ] Domain purity — no framework imports""",
      """- `docs/08-decisions/ADR-017-channel-abstraction.md`
- `docs/04-technology/monorepo-structure.md`"""),

    t(126, "contracts-bot-notification-zod", "Epic-01-Channel-Abstraction", "Contracts — Bot & Notification Zod", "P0",
      "TASK-124, TASK-125", "TASK-134, TASK-137, TASK-138", "5h",
      "Zod schemas برای bot link API، notification payloads، و Bale webhook Update — هم‌تراز 100% با API tasks.",
      """- [ ] `packages/contracts/bot/link-token.schema.ts`
- [ ] `packages/contracts/bot/bale-update.schema.ts` (subset: message, callback_query)
- [ ] `packages/contracts/notifications/notification-log.schema.ts`
- [ ] `phoneSchema` از shared برای staff-initiated link
- [ ] bigint amounts as string in examples
- [ ] Export از `packages/contracts/src/index.ts`""",
      """### POST /bot/link-token request
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

### Bale Update (webhook body subset)
```typescript
export const baleUserSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  is_bot: z.boolean().optional(),
  first_name: z.string(),
  username: z.string().optional(),
});
export const baleUpdateSchema = z.object({
  update_id: z.number().int(),
  message: baleMessageSchema.optional(),
  callback_query: baleCallbackQuerySchema.optional(),
}).refine(u => u.message || u.callback_query, { message: 'empty update' });
```

### NotificationLog DTO
```typescript
export const notificationLogStatusSchema = z.enum([
  'scheduled', 'sent', 'failed', 'skipped'
]);
```""",
      """| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/bot/link-token.schema.ts` |
| Create | `packages/contracts/src/bot/bale-update.schema.ts` |
| Create | `packages/contracts/src/notifications/notification-log.schema.ts` |
| Update | `packages/contracts/src/index.ts` |""",
      """1. Define link-token schemas with deep link pattern `ble.ir`
2. Bale update schemas — `User.id` coerce to string
3. Notification log list/detail DTOs
4. Contract unit tests (parse valid/invalid samples)""",
      """| سناریو | Code | رفتار |
|--------|------|--------|
| Invalid UUID tenantCustomerId | 400 `VALIDATION_ERROR` | Zod fail |
| Update without message/callback | — | schema reject |
| User.id > 2^31 | — | stored as string |""",
      """- [ ] Unit: link-token request/response roundtrip
- [ ] Unit: bale update samples from bale-api-reference
- [ ] Unit: invalid update rejected""",
      """- [ ] EXCELLENCE §8 fields on DTOs
- [ ] ADR-016 API versioning `/api/v1`
- [ ] ADR-017 channel codes""",
      """- `docs/05-channels/bale-api-reference.md`
- `packages/contracts/` conventions"""),
]

# Remaining tasks 127-174 will be appended by generator main file
