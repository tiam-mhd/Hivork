# Epic-10 — Marketing Foundation

## هدف Epic

Route group `(marketing)` و layout/nav برای سایت عمومی — جدا از پنل admin.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-158 | [TASK-158-marketing-route-group.md](./TASK-158-marketing-route-group.md) | Marketing Route Group | TASK-123 | P0 |
| TASK-159 | [TASK-159-marketing-layout-nav.md](./TASK-159-marketing-layout-nav.md) | Marketing Layout & Nav | TASK-158 | P0 |

---

## Dependency داخلی Epic

```
TASK-123
    │
    ▼
TASK-158 (routes)
    │
    ▼
TASK-159 (layout)
    │
    ▼
Epic-11 Marketing Pages
```

---

## Policy notes

- Public routes — no staff auth required
- RTL + fa-IR + theme tokens
- Separate from `(seller)/admin` layout

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
