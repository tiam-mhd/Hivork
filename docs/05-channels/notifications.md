# Notification Engine — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-006, ADR-008

## معماری

```
ReminderPolicy (from settings)
        ↓
Scheduler Job (daily + delayed)
        ↓
NotificationService
        ↓
┌───────────┬───────────┬───────────┐
│ Telegram  │   Bale    │   SMS     │
│ Adapter   │  Adapter  │  Adapter  │
└───────────┴───────────┴───────────┘
        ↓
NotificationLog (immutable)
```

---

## Channel Abstraction

```typescript
interface NotificationChannel {
  code: 'telegram' | 'bale' | 'sms'
  send(recipient: Recipient, payload: NotificationPayload): Promise<Result>
  isAvailable(recipient: Recipient): boolean
}

interface Recipient {
  globalCustomerId?: string
  staffId?: string
  telegramId?: string
  baleId?: string
  phone?: string
}
```

---

## Reminder Types

| Type | Trigger |
|------|---------|
| `before_Nd` | N days before due_date |
| `on_due_date` | due_date at reminder_time |
| `overdue_Nd` | N days after due_date (status overdue) |

---

## Scheduling (BullMQ)

```
Daily job 06:00 Tehran:
  → find installments matching reminder rules
  → enqueue SendReminderJob(delay until reminder_time)

SendReminderJob:
  → check idempotency (notification_log)
  → resolve customer bot identity
  → send via channel adapter
  → log result
```

**Idempotency Key:** `(installment_id, reminder_type, channel)`

---

## Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | immediate |
| 2 | 5 min |
| 3 | 30 min |
| 4 | 2 hour |
| fail | dead letter + alert |

---

## Message Templates (fa)

### Customer — Before Due

```
🔔 یادآور قسط

فروشگاه: {tenant_name}
مبلغ: {amount_toman} تومان
سررسید: {due_date_jalali}

[مشاهده جزئیات] [پرداخت کردم]
```

### Customer — Overdue

```
⚠️ قسط سررسید گذشته

...
```

### Seller — Daily Summary

```
📊 خلاصه امروز — {tenant_name}

{count} مشتری سررسید امروز
{overdue_count} قسط معوق

[ورود به پنل]
```

---

## Bot Gateway Architecture

```
Webhook POST /webhooks/telegram
        ↓
Verify signature
        ↓
Command Router (/start, /installments, /pay, ...)
        ↓
Application Use Case (same as REST API)
        ↓
Response Builder (inline keyboard, deep links)
```

**Webhook** — نه polling — production.

---

## Fallback Strategy (به‌روز 1405/04/09)

```
1. Try bale (if linked) — کانال اصلی فاز ۴
2. Try telegram (if linked) — deferred فاز ۲
3. Try SMS (if enabled + opt-in) — فاز ۶
4. Log failure — seller notified in panel
```

---

## Seller Notifications (In-App + Bot)

| Event | Channel |
|-------|---------|
| Payment reported | bot + panel badge |
| New sale | optional |
| Daily summary | bot (opt-in) |
| Overdue threshold | bot + panel |

---

## Compliance

- SMS: opt-in required (قوانین spam ایران)
- Customer can mute reminders (setting — با warning)
- Rate limit per customer: max N messages/day
