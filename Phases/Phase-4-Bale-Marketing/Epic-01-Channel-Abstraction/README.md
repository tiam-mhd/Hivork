# Epic-01 — Channel Abstraction

## هدف Epic

تعریف ADR و لایه abstraction برای کانال‌های اعلان (بله، تلگرام، SMS) — port `NotificationChannel` و contracts Zod هم‌تراز API.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-124 | [TASK-124-adr-channel-abstraction.md](./TASK-124-adr-channel-abstraction.md) | ADR Channel Abstraction | TASK-123 | P0 |
| TASK-125 | [TASK-125-notification-channel-port.md](./TASK-125-notification-channel-port.md) | NotificationChannel Port Interface | TASK-124 | P0 |
| TASK-126 | [TASK-126-contracts-bot-notification-zod.md](./TASK-126-contracts-bot-notification-zod.md) | Contracts — Bot & Notification Zod | TASK-124, TASK-125 | P0 |

---

## Dependency داخلی Epic

```
TASK-123
    │
    ▼
TASK-124 (ADR)
    │
    ▼
TASK-125 (port)
    │
    ▼
TASK-126 (contracts)
    │
    ▼
Epic-02 Bale Infra
```

---

## Policy notes

- **ADR-018** — Channel Abstraction (TASK-124)
- **ADR-006** — Multi-channel notifications
- Contracts در `packages/contracts` — bigint as string

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
