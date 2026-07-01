# Epic-02 — Bale Infrastructure

## هدف Epic

کلاینت HTTP بله، اعتبارسنجی Update types، و ثبت webhook در startup — مطابق `bale-api-reference.md`.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-127 | [TASK-127-bale-http-client.md](./TASK-127-bale-http-client.md) | Bale HTTP Client | TASK-126 | P0 |
| TASK-128 | [TASK-128-bale-update-types-validation.md](./TASK-128-bale-update-types-validation.md) | Bale Update Types & Zod Validation | TASK-127 | P0 |
| TASK-129 | [TASK-129-bale-webhook-registration-env.md](./TASK-129-bale-webhook-registration-env.md) | Webhook Registration & Env | TASK-127 | P0 |

---

## Dependency داخلی Epic

```
TASK-126
    │
    ▼
TASK-127 (HTTP client)
    ├──────────┐
    ▼          ▼
TASK-128    TASK-129
    │          │
    └────┬─────┘
         ▼
Epic-05 Bot Gateway
```

---

## Policy notes

- Base URL: `https://tapi.bale.ai/bot{token}/`
- Webhook ports: **443**, **88**
- Rate limit 429 + `retry_after`
- `User.id` → store as **string**

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
