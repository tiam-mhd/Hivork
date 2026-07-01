# TASK-124: ADR — Channel Abstraction

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-01-Channel-Abstraction |
| ID | TASK-124 |
| Priority | P0 |
| Depends on | TASK-123 |
| Blocks | TASK-125, TASK-126 |
| Estimated | 4h |

---

## هدف

ثبت ADR-018 برای abstraction کانال‌های اعلان — جداسازی port از adapterهای Bale/Telegram/SMS قبل از پیاده‌سازی فاز ۴.

---

## معیار پذیرش

- [ ] فایل `docs/08-decisions/ADR-018-channel-abstraction.md` با status Approved
- [ ] ثبت در `adr-log.md`
- [ ] Interface `NotificationChannel` + `Recipient` مستند
- [ ] Idempotency key: `(installmentId, reminderType, channel)`
- [ ] Fallback: telegram → bale → sms → panel log
- [ ] Self-review ≥ 95

---

## مشخصات فنی

### ADR-018 Structure

| بخش | محتوا |
|-----|--------|
| Context | فاز ۴ بله اول؛ تلگرام deferred؛ نیاز port مشترک |
| Decision | `packages/domain/core/ports/notification-channel.port.ts` |
| Adapters | `packages/infrastructure/notifications/bale-notification.adapter.ts` |
| Service | `packages/application/notifications/notification.service.ts` |
| Consequences | Adapter stateless؛ rate limit per adapter |

### NotificationChannel (reference)

```typescript
export type ChannelCode = 'telegram' | 'bale' | 'sms';
export interface NotificationChannel {
  readonly code: ChannelCode;
  send(recipient: Recipient, payload: NotificationPayload): Promise<SendResult>;
  isAvailable(recipient: Recipient): boolean;
}
```

### Idempotency

```
idempotencyKey = sha256(`${installmentId}:${reminderType}:${channel}`)
→ unique index on NotificationLog.idempotencyKey
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `docs/08-decisions/ADR-018-channel-abstraction.md` |
| Update | `docs/08-decisions/adr-log.md` |
| Update | `docs/05-channels/notifications.md` |

---

## مراحل پیاده‌سازی

1. Draft ADR با Context/Decision/Consequences
2. Align diagram با notifications.md
3. Team review → Approved
4. Link در Phase 4 README و Epic-01

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Adapter بدون port | — | PR blocked |
| Logic مالی در adapter | — | فقط transport |

---

## تست

- [ ] Doc review checklist
- [ ] No open questions

---

## Policy Alignment

- [ ] ADR-018
- [ ] ADR-006 multi-channel
- [ ] DOCUMENTATION_AUTHORING_RULES §9

---

## مراجع

- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/08-decisions/adr-log.md`

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
