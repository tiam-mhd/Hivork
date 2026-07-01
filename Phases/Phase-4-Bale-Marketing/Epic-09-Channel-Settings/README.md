# Epic-09 — Channel Settings

## هدف Epic

Settings schema کانال‌ها، use case/API ترجیحات، و UI تنظیمات در پنل فروشنده.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-155 | [TASK-155-settings-schema-channels.md](./TASK-155-settings-schema-channels.md) | Settings Schema — Channels | TASK-154, TASK-048 | P0 |
| TASK-156 | [TASK-156-usecase-api-channel-preferences.md](./TASK-156-usecase-api-channel-preferences.md) | Use Case & API — Channel Preferences | TASK-155 | P0 |
| TASK-157 | [TASK-157-frontend-channel-settings-ui.md](./TASK-157-frontend-channel-settings-ui.md) | Frontend — Channel Settings UI | TASK-156, TASK-114 | P0 |

---

## Dependency داخلی Epic

```
TASK-154
    │
    ▼
TASK-155 (schema)
    │
    ▼
TASK-156 (API)
    │
    ▼
TASK-157 (UI)
```

---

## Policy notes

- Schema-based settings فقط — نه free-form
- Permission: `core.settings.update` یا `installments.settings.update`
- Excellence §5 form + §7 page states

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
