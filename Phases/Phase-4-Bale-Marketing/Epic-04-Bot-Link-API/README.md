# Epic-04 — Bot Link API

## هدف Epic

Use cases تولید token لینک، اتصال BotIdentity مشتری/فروشنده، و API `POST /bot/link-token`.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-134 | [TASK-134-usecase-generate-bot-link-token.md](./TASK-134-usecase-generate-bot-link-token.md) | Use Case — GenerateBotLinkToken | TASK-132, TASK-133 | P0 |
| TASK-135 | [TASK-135-usecase-link-bot-identity.md](./TASK-135-usecase-link-bot-identity.md) | Use Case — LinkBotIdentity | TASK-133, TASK-134 | P0 |
| TASK-136 | [TASK-136-usecase-staff-bot-link.md](./TASK-136-usecase-staff-bot-link.md) | Use Case — StaffBotLink | TASK-131, TASK-135 | P0 |
| TASK-137 | [TASK-137-api-post-bot-link-token.md](./TASK-137-api-post-bot-link-token.md) | API — POST /bot/link-token | TASK-134, TASK-136, TASK-126 | P0 |

---

## Dependency داخلی Epic

```
TASK-133
    │
    ▼
TASK-134 → TASK-135
    │           │
    │           ▼
    │      TASK-136
    │           │
    └─────┬─────┘
          ▼
TASK-137 (API)
          │
          ▼
Epic-05 + Epic-06
```

---

## Policy notes

- Deep link: `https://ble.ir/{username}?start=link_{token}`
- Token one-time — Redis consume on link
- Audit: `bot.link_token.create`, `bot.identity.link`

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
