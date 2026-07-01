# Epic-08 — Scheduler & Notifications

## هدف Epic

BullMQ jobs (MarkOverdue، ScheduleReminders، SendReminder)، BaleNotificationAdapter، NotificationService.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-150 | [TASK-150-bullmq-setup.md](./TASK-150-bullmq-setup.md) | BullMQ Setup (Scheduler) | TASK-133, TASK-009 | P0 |
| TASK-151 | [TASK-151-mark-overdue-job.md](./TASK-151-mark-overdue-job.md) | Job — MarkOverdueInstallments | TASK-150, TASK-077 | P0 |
| TASK-152 | [TASK-152-schedule-reminders-send-reminder.md](./TASK-152-schedule-reminders-send-reminder.md) | Jobs — ScheduleReminders & SendReminder | TASK-151, TASK-048 | P0 |
| TASK-153 | [TASK-153-bale-notification-adapter.md](./TASK-153-bale-notification-adapter.md) | BaleNotificationAdapter | TASK-127, TASK-125, TASK-152 | P0 |
| TASK-154 | [TASK-154-notification-service.md](./TASK-154-notification-service.md) | NotificationService | TASK-153, TASK-130, TASK-133 | P0 |

---

## Dependency داخلی Epic

```
TASK-133
    │
    ▼
TASK-150 (BullMQ)
    │
    ▼
TASK-151 (overdue)
    │
    ▼
TASK-152 (reminders)
    │
    ▼
TASK-153 (adapter) → TASK-154 (service)
    │
    ▼
Epic-09 Settings
```

---

## Policy notes

- Idempotency key: `(installmentId, reminderType, channel)`
- Tehran TZ برای overdue boundary
- Retry 4x + dead letter
- Batch send ≥50ms gap

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
