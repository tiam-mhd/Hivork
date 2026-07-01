# TASK-170: Test — Reminder Idempotency

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-14-Phase4-Tests |
| ID | TASK-170 |
| Priority | P0 |
| Depends on | TASK-154, TASK-153 |
| Blocks | TASK-174 |
| Estimated | 5h |

---

## هدف

Integration test — duplicate reminder send skipped via idempotencyKey.

---

## معیار پذیرش

- [ ] Send same reminder twice → one NotificationLog sent
- [ ] Second call returns skipped
- [ ] Mock Bale adapter

---

## مشخصات فنی

### Scenario

```
installmentId=X, reminderType=before_due, channel=bale
→ first send: sent
→ second send: skipped (idempotency)
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/notifications/notification.service.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Setup installment + identity
2. Double send
3. Assert single external call

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Different reminderType | — | allowed second send |

---

## تست

- [ ] Integration: idempotency

---

## Policy Alignment

- [ ] NotificationLog append-only
- [ ] NotificationLog idempotency (duplicate send prevention)

---

## مراجع

- `docs/05-channels/notifications.md`

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
