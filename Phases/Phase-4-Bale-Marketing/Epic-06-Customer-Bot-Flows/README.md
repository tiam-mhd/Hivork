# Epic-06 — Customer Bot Flows

## هدف Epic

فلوهای مشتری در بازوی بله: `/start link_*`، لیست اقساط، گزارش پرداخت، templates و keyboards.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-142 | [TASK-142-start-link-handler.md](./TASK-142-start-link-handler.md) | /start Link Handler | TASK-135, TASK-137, TASK-140 | P0 |
| TASK-143 | [TASK-143-list-installments-bot.md](./TASK-143-list-installments-bot.md) | List Installments (Bot) | TASK-142, TASK-075 | P0 |
| TASK-144 | [TASK-144-report-payment-callback.md](./TASK-144-report-payment-callback.md) | Report Payment Callback | TASK-143, TASK-141 | P0 |
| TASK-145 | [TASK-145-customer-templates-keyboards.md](./TASK-145-customer-templates-keyboards.md) | Customer Templates & Keyboards | TASK-141, TASK-143 | P0 |

---

## Dependency داخلی Epic

```
TASK-140
    │
    ▼
TASK-142 (/start)
    │
    ▼
TASK-143 (installments)
    ├──────────┐
    ▼          ▼
TASK-144    TASK-145
    │
    ▼
Epic-07 + Epic-08
```

---

## Policy notes

- `callback_query_id` starting with `1` → old client → use `sendMessage`
- Markdown formatting per bale-api-reference
- PaymentAttempt pending — نه auto-paid (ADR-008)

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
