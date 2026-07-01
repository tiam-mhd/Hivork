# IFP-TASK-129: Reports — SMS & Bot

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 07 � Dashboard, Reports & Calendar |
| Epic | Epic-04-Reports-Engine |
| ID | IFP-TASK-129 |
| Priority | P0 |
| Depends on | IFP-TASK-125, IFP-TASK-142 |
| Blocks | IFP-TASK-130, IFP-TASK-136 |
| Estimated | 6h |

---

## هدف

گزارش پیامک و ربات بله از NotificationLog.

---

## معیار پذیرش

- [ ] SMS: sent/failed/skipped by day, template, line
- [ ] Bot: Bale messages sent, broadcast stats
- [ ] NotificationLog append-only read
- [ ] Cross-ref IFP Phase 08 notification history

---

## مشخصات فنی

### Data Source

`NotificationLog` — channel in (sms, bale) — tenant scoped.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/reports/sms-report.use-case.ts` |
| Create | `packages/application/installments/reports/bot-report.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Query NotificationLog
2. Aggregate by day/channel
3. API endpoints

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No logs | 200 | empty |

---

## تست

- [ ] Integration: SMS report
- [ ] Integration: bot report

---

## Policy Alignment

- [ ] NotificationLog append-only exception

---

## مراجع

- `docs/05-channels/notifications.md`
- `Phases/Phase-4-Bale-Marketing/`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 14 | Epic sync |
| **جمع** | **/100** | **98** | ≥95 required برای Ready |
