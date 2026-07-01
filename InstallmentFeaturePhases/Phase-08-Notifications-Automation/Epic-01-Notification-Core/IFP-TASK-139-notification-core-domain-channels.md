# IFP-TASK-139: Domain — Notification Core & Channel Abstraction

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 08 � Notifications & Automation |
| Epic | Epic-01-Notification-Core |
| ID | IFP-TASK-139 |
| Priority | P0 |
| Depends on | IFP-TASK-138, TASK-130 |
| Blocks | IFP-TASK-140, IFP-TASK-141, IFP-TASK-142 |
| Estimated | 8h |

---

## هدف

هسته دامنه اعلان با abstraction کانال (in-app, email, push, sms, bale) و یکپارچگی با NotificationLog.

---

## معیار پذیرش

- [ ] NotificationChannel interface: send, validate, status
- [ ] Notification entity با soft delete
- [ ] InAppNotification model
- [ ] Channel registry pattern
- [ ] Unit tests per channel mock

---

## مشخصات فنی

### Channels

| channel | adapter |
|---------|---------|
| in_app | InAppChannelAdapter |
| email | EmailChannelAdapter (SMTP/SendGrid) |
| push | PushChannelAdapter (Web Push) |
| sms | SmsChannelAdapter (→ Epic-02) |
| bale | BaleChannelAdapter (→ Phase 4) |

### Notification (business)

Base fields + tenantId, channel, templateId?, recipientRef, payload JSON, status, scheduledAt

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/notifications/` |
| Create | `packages/infrastructure/persistence/prisma/schema/notification.prisma` |

---

## مراحل پیاده‌سازی

1. Domain entities
2. Channel interface
3. Prisma models
4. Unit tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Unknown channel | 400 | CHANNEL_NOT_SUPPORTED |

---

## تست

- [ ] Unit: channel registry
- [ ] Unit: notification state

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 base fields روی entityهای business
- [ ] SOFT-DELETE-POLICY — soft delete فقط؛ بدون `prisma.*.delete()`
- [ ] NotificationLog append-only for delivery log

---

## مراجع

- `docs/01-product/installment-module-features.md §8`
- `docs/05-channels/notifications.md`
- `Phases/Phase-4-Bale-Marketing/Epic-03-Notification-Database/TASK-130-prisma-notification-log.md`

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
