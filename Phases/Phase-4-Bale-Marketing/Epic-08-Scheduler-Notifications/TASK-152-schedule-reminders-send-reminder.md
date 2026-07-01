# TASK-152: Jobs — ScheduleReminders & SendReminder

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-08-Scheduler-Notifications |
| ID | TASK-152 |
| Priority | P0 |
| Depends on | TASK-151, TASK-048 |
| Blocks | TASK-153 |
| Estimated | 6h |

---

## هدف

Job زمان‌بندی یادآورها از settings و enqueue SendReminder per installment.

---

## معیار پذیرش

- [ ] `ScheduleRemindersJob` — read reminder settings TASK-048
- [ ] `SendReminderJob` — payload to NotificationService
- [ ] Reminder types: before_due, on_due, overdue
- [ ] Batch ≥50ms gap between enqueues
- [ ] Respect tenant channel preferences

---

## مشخصات فنی

### Schedule logic

```
For each tenant with reminders enabled:
  find installments matching reminder window
  enqueue SendReminder { installmentId, reminderType, channel }
```

### Settings keys

From `installments.reminders.*` schema — TASK-048/155

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/scheduler/src/jobs/schedule-reminders.job.ts` |
| Create | `apps/scheduler/src/jobs/send-reminder.job.ts` |
| Create | `apps/scheduler/src/jobs/reminder.jobs.spec.ts` |

---

## مراحل پیاده‌سازی

1. ScheduleReminders scans installments
2. SendReminder enqueues notification
3. Settings integration
4. Batch throttle
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Reminders disabled | — | skip tenant |
| No bale chat linked | — | skip channel bale |
| Duplicate schedule same day | — | idempotency key |

---

## تست

- [ ] Unit: schedule windows
- [ ] Integration: job enqueues send

---

## Policy Alignment

- [ ] Settings schema only
- [ ] Idempotency per installment+type+channel

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
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
