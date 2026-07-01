# Epic-07 — Seller Bot Flows

## هدف Epic

اتصال فروشنده به بازو، خلاصه روزانه، هشدار «پرداخت گزارش شد»، و templates فارسی.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-146 | [TASK-146-seller-connect-bot.md](./TASK-146-seller-connect-bot.md) | Seller Connect Bot | TASK-136, TASK-145 | P0 |
| TASK-147 | [TASK-147-daily-summary-notification.md](./TASK-147-daily-summary-notification.md) | Daily Summary Notification | TASK-146, TASK-131 | P0 |
| TASK-148 | [TASK-148-payment-reported-alert.md](./TASK-148-payment-reported-alert.md) | Payment Reported Alert | TASK-144, TASK-146 | P0 |
| TASK-149 | [TASK-149-seller-templates.md](./TASK-149-seller-templates.md) | Seller Message Templates | TASK-145, TASK-147 | P0 |

---

## Dependency داخلی Epic

```
TASK-145
    │
    ▼
TASK-146 (connect)
    │
    ▼
TASK-147 (daily)
    ├──────────┐
    ▼          ▼
TASK-148    TASK-149
    │
    ▼
Epic-08 Scheduler
```

---

## Policy notes

- StaffBotIdentity — `staffId` + `platform=bale`
- Opt-in برای daily summary (settings)
- Deep link به پنل `/admin`

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
