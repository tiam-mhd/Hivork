# TASK-151: Job — MarkOverdueInstallments

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-08-Scheduler-Notifications |
| ID | TASK-151 |
| Priority | P0 |
| Depends on | TASK-150, TASK-077 |
| Blocks | TASK-152, TASK-171 |
| Estimated | 5h |

---

## هدف

Cron job علامت‌گذاری اقساط معوق — مرز timezone تهران.

---

## معیار پذیرش

- [ ] Daily cron 00:05 Asia/Tehran
- [ ] Reuse MarkOverdue logic from TASK-077 domain rules
- [ ] Batch update with tenant isolation
- [ ] Audit summary metric
- [ ] Job idempotent per calendar day

---

## مشخصات فنی

### Timezone boundary

```typescript
const tehranToday = startOfDayInTimezone(new Date(), 'Asia/Tehran');
// dueDate < tehranToday AND status=pending → overdue
```

### Idempotency

Job key: `mark-overdue:{tenantId}:{YYYY-MM-DD}`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/scheduler/src/jobs/mark-overdue-installments.job.ts` |
| Create | `apps/scheduler/src/jobs/mark-overdue-installments.job.spec.ts` |

---

## مراحل پیاده‌سازی

1. Job handler
2. Tehran TZ utility
3. Wire ListOverdue/Mark use cases
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Already overdue | — | skip |
| Due today Tehran | — | still pending until tomorrow |
| UTC midnight edge | — | Tehran date governs |

---

## تست

- [ ] Unit: Tehran boundary cases
- [ ] Integration: status transition

---

## Policy Alignment

- [ ] Asia/Tehran timezone
- [ ] Tenant-scoped updates

---

## مراجع

- `Phases/Phase-1-Seller-Panel/Epic-05-Installments-Use-Cases/TASK-077-usecase-list-overdue-installments.md`

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
