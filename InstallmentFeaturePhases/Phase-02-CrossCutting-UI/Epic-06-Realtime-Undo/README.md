# Epic-06 — Realtime & Undo

> **Phase:** 02 — Cross-Cutting UI  
> **Priority:** P1  
> **ADR:** ADR-004 (audit), ADR-013

---

## هدف Epic

**Shell اعلان لحظه‌ای** (SSE یا WebSocket) برای toast/badge در header، و الگوی **Undo** برای عملیات مهم + **registry میانبرهای صفحه‌کلید**. پیاده‌سازی Undo روی هر عملیات دامنه‌ای در فازهای مربوطه hook می‌شود؛ این Epic زیرساخت و قرارداد را تعریف می‌کند.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-TASK-031 | [IFP-TASK-031-realtime-notifications-shell.md](./IFP-TASK-031-realtime-notifications-shell.md) | Real-time notifications shell (SSE/WebSocket) | IFP-TASK-018, TASK-101 | P1 |
| IFP-TASK-032 | [IFP-TASK-032-undo-pattern-keyboard-shortcuts.md](./IFP-TASK-032-undo-pattern-keyboard-shortcuts.md) | Undo pattern + keyboard shortcuts registry | IFP-TASK-019, IFP-TASK-031 | P1 |

---

## Dependency داخلی Epic

```
IFP-TASK-018 (auth session)
    └──► IFP-TASK-031 (realtime transport)
              └──► IFP-TASK-032 (undo toast + shortcuts)
```

Undo handlers برای عملیات مالی (cancel sale, confirm payment) در Phase 05–06 به registry اضافه می‌شوند.

---

## Policy notes

- Realtime: tenant-scoped channel — `tenant:{tenantId}:staff:{staffId}`
- Reconnect با exponential backoff؛ fallback polling 60s
- Undo window: configurable (default 10s) — فقط عملیات reversible
- Financial undo: **همیشه** server-side reverse use case — نه optimistic-only
- Shortcuts: `?` help modal؛ conflict با input fields جلوگیری شود
- Audit: undo action logged جداگانه

---

## Blocks

- Phase 08 Notifications (push به همین shell)
- Payment confirm undo در Phase 06
