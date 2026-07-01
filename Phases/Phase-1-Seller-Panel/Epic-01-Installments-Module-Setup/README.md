# Epic-01 — Installments Module Setup

## هدف Epic

ارتقای ماژول `installments` از skeleton (TASK-059) به ماژول production-ready: permissions کامل، seed integration، settings schema، و ثبت route namespace — پیش‌نیاز تمام Epicهای بعدی Phase 1.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-060 | [TASK-060-installments-module-registration.md](./TASK-060-installments-module-registration.md) | Installments Module Registration (Production) | TASK-054, TASK-059 | P0 |

---

## Dependency داخلی Epic

```
TASK-054 (Phase 0 E2E) + TASK-059 (skeleton)
              │
              ▼
          TASK-060
              │
              ▼
    Epic-02 (Database) — TASK-061
```

---

## Policy notes

- Permissions **100%** از `docs/02-architecture/rbac.md` § Installments — نه لیست skeleton TASK-059
- `@RequireModule('installments')` روی **همه** endpointهای ماژول (Epic-09)
- Settings schema stub → production در TASK-070/TASK-078
- SOFT-DELETE: N/A در این Epic (بدون entity جدید)

---

## مراجع

- `Phases/Phase-0-Foundation/Epic-03-Packages-Skeleton/TASK-059-modules-installments-skeleton.md`
- `docs/02-architecture/rbac.md`
- `docs/02-architecture/modules.md`
