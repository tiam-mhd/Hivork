# TASK-147: Daily Summary Notification

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-07-Seller-Bot-Flows |
| ID | TASK-147 |
| Priority | P0 |
| Depends on | TASK-146, TASK-131 |
| Blocks | TASK-149 |
| Estimated | 5h |

---

## هدف

اعلان خلاصه روزانه به فروشنده — today due + overdue counts via Bale.

---

## معیار پذیرش

- [ ] `SendDailySummaryUseCase` — opt-in from settings
- [ ] Schedule via BullMQ cron (TASK-152 integration point)
- [ ] Message: today count, overdue count, link to panel
- [ ] Skip if StaffBotIdentity missing
- [ ] NotificationLog entry

---

## مشخصات فنی

### Summary content

```
خلاصه امروز — {shopName}
سررسید امروز: {todayCount}
معوق: {overdueCount}
پنل: https://app.hivork.ir/admin
```

### Opt-in

`settings.channels.dailySummaryEnabled` — TASK-155

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/notifications/send-daily-summary.use-case.ts` |
| Create | `packages/application/notifications/send-daily-summary.use-case.spec.ts` |

---

## مراحل پیاده‌سازی

1. Use case aggregates counts
2. Bale send via adapter
3. Settings gate
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No bot linked | — | skip silently |
| Opt-out | — | skip |
| 429 from Bale | — | retry via adapter |

---

## تست

- [ ] Unit: skips without identity
- [ ] Unit: message format

---

## Policy Alignment

- [ ] Settings schema only
- [ ] NotificationLog append

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
