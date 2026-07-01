# Epic-03 — Notification Database

## هدف Epic

Prisma `NotificationLog` (append-only)، `StaffBotIdentity`، Redis `BotLinkToken`، و repositories.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-130 | [TASK-130-prisma-notification-log.md](./TASK-130-prisma-notification-log.md) | Prisma — NotificationLog | TASK-126 | P0 |
| TASK-131 | [TASK-131-prisma-staff-bot-identity.md](./TASK-131-prisma-staff-bot-identity.md) | Prisma — StaffBotIdentity | TASK-130 | P0 |
| TASK-132 | [TASK-132-redis-bot-link-token.md](./TASK-132-redis-bot-link-token.md) | Redis — BotLinkToken Store | TASK-126 | P0 |
| TASK-133 | [TASK-133-notification-repositories.md](./TASK-133-notification-repositories.md) | Notification Repositories | TASK-130, TASK-131, TASK-132 | P0 |

---

## Dependency داخلی Epic

```
TASK-126
    ├────────────┐
    ▼            ▼
TASK-130      TASK-132
    │
    ▼
TASK-131
    │
    ▼
TASK-133 (repos)
    │
    ▼
Epic-04 + Epic-08
```

---

## Policy notes

- **NotificationLog:** append-only — **no delete** (مثل AuditLog)
- **StaffBotIdentity:** base fields + soft delete
- `onDelete: Restrict` — نه Cascade
- Redis TTL 72h برای link token

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
