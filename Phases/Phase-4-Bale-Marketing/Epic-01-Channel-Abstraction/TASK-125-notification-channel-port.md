# TASK-125: NotificationChannel Port Interface

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-01-Channel-Abstraction |
| ID | TASK-125 |
| Priority | P0 |
| Depends on | TASK-124 |
| Blocks | TASK-126, TASK-153 |
| Estimated | 3h |

---

## هدف

پیاده‌سازی port `NotificationChannel` در `packages/domain` — zero framework imports.

---

## معیار پذیرش

- [ ] `notification-channel.port.ts` exported
- [ ] Types: ChannelCode, Recipient, NotificationPayload, SendResult
- [ ] `SendResult` با retryable + retryAfterSec برای 429
- [ ] Vitest unit test با mock adapter
- [ ] `pnpm turbo typecheck` pass

---

## مشخصات فنی

```typescript
// packages/domain/core/ports/notification-channel.port.ts
export type ChannelCode = 'telegram' | 'bale' | 'sms';

export type SendResult =
  | { ok: true; externalMessageId?: string }
  | { ok: false; retryable: boolean; retryAfterSec?: number; errorCode?: string };

export interface Recipient {
  globalCustomerId?: string;
  staffId?: string;
  baleChatId?: string;       // string — User.id may exceed 2^31
  telegramChatId?: string;
  phone?: string;
}

export interface NotificationPayload {
  templateKey: string;
  variables: Record<string, string>;
  replyMarkup?: unknown;
}

export interface NotificationChannel {
  readonly code: ChannelCode;
  send(recipient: Recipient, payload: NotificationPayload): Promise<SendResult>;
  isAvailable(recipient: Recipient): boolean;
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/core/ports/notification-channel.port.ts` |
| Create | `packages/domain/core/ports/notification-channel.port.spec.ts` |
| Update | `packages/domain/core/ports/index.ts` |

---

## مراحل پیاده‌سازی

1. Implement types per ADR-018
2. Export from domain index
3. Vitest mock adapter tests
4. Typecheck

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No baleChatId | — | isAvailable → false |
| 429 from API | retryAfterSec | retryable=true |

---

## تست

- [ ] Unit: send success/fail
- [ ] Unit: isAvailable per channel

---

## Policy Alignment

- [ ] ADR-018
- [ ] Domain purity — no NestJS/Prisma

---

## مراجع

- `docs/08-decisions/ADR-018-channel-abstraction.md`

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
