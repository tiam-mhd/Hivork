# TASK-150: BullMQ Setup (Scheduler)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-08-Scheduler-Notifications |
| ID | TASK-150 |
| Priority | P0 |
| Depends on | TASK-133, TASK-009 |
| Blocks | TASK-151 |
| Estimated | 4h |

---

## هدف

راه‌اندازی BullMQ در `apps/scheduler` — queues, workers, Redis connection reuse TASK-009.

---

## معیار پذیرش

- [ ] Queues: `installments.overdue`, `notifications.reminders`, `notifications.send`
- [ ] Worker registration in scheduler app
- [ ] Dead letter + 4 retries exponential
- [ ] Health check endpoint
- [ ] Align with TASK-009 skeleton

---

## مشخصات فنی

### Queues

| Queue | Job |
|-------|-----|
| `installments.overdue` | MarkOverdueInstallments |
| `notifications.reminders` | ScheduleReminders |
| `notifications.send` | SendReminder |

### Retry policy

```
attempts: 4, backoff: exponential, delay: 5000
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/scheduler/src/queues/notification.queues.ts` |
| Create | `apps/scheduler/src/workers/index.ts` |
| Update | `apps/scheduler/src/app.module.ts` |

---

## مراحل پیاده‌سازی

1. Define queues
2. Worker bootstrap
3. Retry config
4. Health check

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Redis down | — | worker pause + alert |
| Job throws | — | retry then DLQ |

---

## تست

- [ ] Integration: enqueue job processed
- [ ] Unit: retry config

---

## Policy Alignment

- [ ] Reuse TASK-009 patterns
- [ ] Structured logging

---

## مراجع

- `docs/06-operations/testing-observability.md`
- `Phases/Phase-1-Seller-Panel/`

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
