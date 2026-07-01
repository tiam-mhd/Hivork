# Epic-12 — Tenant Self-Register

## هدف Epic

ثبت‌نام خودکار tenant از سایت مارکتینگ — reuse onboarding Flow A (TASK-055).

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-163 | [TASK-163-register-page.md](./TASK-163-register-page.md) | Register Page | TASK-055, TASK-159 | P0 |
| TASK-164 | [TASK-164-self-register-flow.md](./TASK-164-self-register-flow.md) | Self-Register Flow (API wiring) | TASK-163, TASK-055 | P0 |
| TASK-165 | [TASK-165-post-register-redirect.md](./TASK-165-post-register-redirect.md) | Post-Register Redirect | TASK-164 | P0 |

---

## Dependency داخلی Epic

```
TASK-159 + TASK-055
    │
    ▼
TASK-163 (page)
    │
    ▼
TASK-164 (flow)
    │
    ▼
TASK-165 (redirect)
    │
    ▼
Epic-15 Vertical Slice
```

---

## Policy notes

- OTP rate limit 3/min
- Clone template roles on register
- Cookie: `hivork_staff` after success

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
