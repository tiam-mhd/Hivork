# TASK-153: BaleNotificationAdapter

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-08-Scheduler-Notifications |
| ID | TASK-153 |
| Priority | P0 |
| Depends on | TASK-127, TASK-125, TASK-152 |
| Blocks | TASK-154, TASK-170 |
| Estimated | 5h |

---

## هدف

Adapter implementing `NotificationChannel` port — Bale send via BaleHttpClient.

---

## معیار پذیرش

- [ ] `BaleNotificationAdapter implements NotificationChannel`
- [ ] code = 'bale'
- [ ] isAvailable if baleChatId present
- [ ] send → template render + sendMessage
- [ ] Map 429 to SendResult retryable
- [ ] Unit tests with mock client

---

## مشخصات فنی

### Adapter

```typescript
export class BaleNotificationAdapter implements NotificationChannel {
  readonly code = 'bale' as const;
  isAvailable(r: Recipient) { return !!r.baleChatId; }
  async send(r: Recipient, p: NotificationPayload): Promise<SendResult> { ... }
}
```

### 429 handling

```typescript
return { ok: false, retryable: true, retryAfterSec: params.retry_after ?? 30 };
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/notifications/bale-notification.adapter.ts` |
| Create | `packages/infrastructure/notifications/bale-notification.adapter.spec.ts` |

---

## مراحل پیاده‌سازی

1. Implement port
2. Template rendering injection
3. 429 mapping
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No baleChatId | — | isAvailable false |
| 400 bad chat | retryable false | log error |
| Markdown parse error | — | fallback plain text |

---

## تست

- [ ] Unit: send success
- [ ] Unit: 429 retryable
- [ ] Unit: isAvailable

---

## Policy Alignment

- [ ] ADR-018 adapter stateless
- [ ] No business logic

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
