# Epic-11 — Marketing Pages

## هدف Epic

صفحات Landing، Pricing، Features — responsive، SEO-ready structure.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-160 | [TASK-160-marketing-landing-page.md](./TASK-160-marketing-landing-page.md) | Landing Page | TASK-159 | P0 |
| TASK-161 | [TASK-161-marketing-pricing-page.md](./TASK-161-marketing-pricing-page.md) | Pricing Page | TASK-159 | P0 |
| TASK-162 | [TASK-162-marketing-features-page.md](./TASK-162-marketing-features-page.md) | Features Page | TASK-159 | P0 |

---

## Dependency داخلی Epic

```
TASK-159
    ├──────────┬──────────┐
    ▼          ▼          ▼
TASK-160   TASK-161   TASK-162
    │
    ▼
Epic-12 Self-Register
```

---

## Policy notes

- Excellence §7 — loading skeleton N/A (static), error boundary
- CTA → `/register`
- Mobile-first responsive

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
