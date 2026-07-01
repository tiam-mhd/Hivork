# TASK-154: NotificationService

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-08-Scheduler-Notifications |
| ID | TASK-154 |
| Priority | P0 |
| Depends on | TASK-153, TASK-130, TASK-133 |
| Blocks | TASK-155, TASK-170 |
| Estimated | 6h |

---

## هدف

Orchestrator ارسال اعلان — channel fallback، idempotency، NotificationLog.

---

## معیار پذیرش

- [ ] `NotificationService.send()` — try channels per ADR-018 fallback order
- [ ] Check idempotencyKey in NotificationLog before send
- [ ] Write log scheduled → sent/failed
- [ ] Fallback: telegram → bale → sms → panel log (telegram skipped v1)
- [ ] Integration tests

---

## مشخصات فنی

### Fallback order (v1)

```
bale → sms → panel_log
```

### send flow

```
1. compute idempotencyKey
2. if exists in NotificationLog → skip
3. insert scheduled
4. try adapter.send
5. update sent/failed
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/notifications/notification.service.ts` |
| Create | `packages/application/notifications/notification.service.spec.ts` |

---

## مراحل پیاده‌سازی

1. Service orchestration
2. Idempotency check
3. Log writes
4. Adapter registry
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Idempotency duplicate | — | skip send |
| All channels unavailable | — | log skipped |
| Partial 429 | — | retry job |

---

## تست

- [ ] Integration: idempotent send
- [ ] Unit: fallback order
- [ ] Integration: log append-only

---

## Policy Alignment

- [ ] ADR-018
- [ ] NotificationLog append-only
- [ ] ADR-006 multi-channel

---

## مراجع

- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
