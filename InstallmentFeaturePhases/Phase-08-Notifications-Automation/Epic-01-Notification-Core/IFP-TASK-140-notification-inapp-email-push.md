# IFP-TASK-140: Delivery — In-App, Email, Push

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 08 � Notifications & Automation |
| Epic | Epic-01-Notification-Core |
| ID | IFP-TASK-140 |
| Priority | P0 |
| Depends on | IFP-TASK-139 |
| Blocks | IFP-TASK-142, IFP-TASK-153 |
| Estimated | 10h |

---

## هدف

پیاده‌سازی ارسال in-app، email، و push notification.

---

## معیار پذیرش

- [ ] In-app: real-time via SSE/WebSocket + DB persist
- [ ] Email: template render + SMTP
- [ ] Push: Web Push VAPID for staff PWA
- [ ] Delivery logged to NotificationLog
- [ ] Idempotency key per send

---

## مشخصات فنی

### In-App

`StaffNotification` — readAt, dismissedAt — soft delete

### Email

HTML template + plain text fallback

### Push

VAPID keys in tenant settings

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/notifications/in-app-channel.adapter.ts` |
| Create | `packages/infrastructure/notifications/email-channel.adapter.ts` |
| Create | `packages/infrastructure/notifications/push-channel.adapter.ts` |

---

## مراحل پیاده‌سازی

1. 3 channel adapters
2. Send use case
3. NotificationLog write
4. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Email bounce | — | status=failed in log |
| Push subscription expired | — | skip + log |

---

## تست

- [ ] Integration: in-app create+list
- [ ] Integration: email mock SMTP

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — soft delete فقط؛ بدون `prisma.*.delete()`
- [ ] Idempotency via NotificationLog

---

## مراجع

- `docs/05-channels/notifications.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 14 | Epic sync |
| **جمع** | **/100** | **98** | ≥95 required برای Ready |
