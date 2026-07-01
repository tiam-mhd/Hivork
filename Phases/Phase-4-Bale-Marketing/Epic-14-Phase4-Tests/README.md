# Epic-14 — Phase 4 Tests

## هدف Epic

Integration/RBAC tests برای bot link، idempotency، timezone، webhook auth.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-169 | [TASK-169-test-link-token.md](./TASK-169-test-link-token.md) | Test — Link Token One-Time | TASK-137, TASK-142 | P0 |
| TASK-170 | [TASK-170-test-reminder-idempotency.md](./TASK-170-test-reminder-idempotency.md) | Test — Reminder Idempotency | TASK-154, TASK-153 | P0 |
| TASK-171 | [TASK-171-test-overdue-tehran-tz.md](./TASK-171-test-overdue-tehran-tz.md) | Test — Overdue Tehran TZ | TASK-151 | P0 |
| TASK-172 | [TASK-172-test-webhook-auth.md](./TASK-172-test-webhook-auth.md) | Test — Webhook Secret Auth | TASK-138 | P0 |
| TASK-173 | [TASK-173-test-rbac-bot-api.md](./TASK-173-test-rbac-bot-api.md) | Test — RBAC Bot API | TASK-137 | P0 |

---

## Dependency داخلی Epic

```
Bot + Scheduler Done
    ├────────┬────────┬────────┐
    ▼        ▼        ▼        ▼
TASK-169  TASK-170 TASK-171 TASK-172
    │
    ▼
TASK-173
    │
    ▼
Epic-15 E2E
```

---

## Policy notes

- Testcontainers PG + Redis
- `describe.runIf(hasDatabase)`
- Cross-tenant must fail

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
