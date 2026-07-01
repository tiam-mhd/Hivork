# Epic-05 — Bot Gateway (Bale)

## هدف Epic

Webhook controller، grammY setup، command router با dedup، و `answerCallbackQuery` utility.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-138 | [TASK-138-bale-webhook-controller.md](./TASK-138-bale-webhook-controller.md) | Bale Webhook Controller | TASK-127, TASK-128, TASK-129, TASK-126 | P0 |
| TASK-139 | [TASK-139-grammy-bale-setup.md](./TASK-139-grammy-bale-setup.md) | grammY Bale Setup | TASK-127, TASK-138 | P0 |
| TASK-140 | [TASK-140-command-router-dedup.md](./TASK-140-command-router-dedup.md) | Command Router & Dedup | TASK-138, TASK-139 | P0 |
| TASK-141 | [TASK-141-answer-callback-query-utility.md](./TASK-141-answer-callback-query-utility.md) | answerCallbackQuery Utility | TASK-127, TASK-139 | P0 |

---

## Dependency داخلی Epic

```
TASK-129
    │
    ▼
TASK-138 (webhook)
    │
    ▼
TASK-139 (grammY)
    │
    ▼
TASK-140 (router)
    │
    ▼
TASK-141 (callbacks)
    │
    ▼
Epic-06 Customer Flows
```

---

## Policy notes

- **هیچ business logic در controller** — فقط delegate به `@hivork/application`
- Header: `X-Telegram-Bot-Api-Secret-Token`
- HTTP 200 سریع — پردازش async اگر >2s

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
