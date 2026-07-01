# TASK-171: Test — Overdue Tehran TZ

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-14-Phase4-Tests |
| ID | TASK-171 |
| Priority | P0 |
| Depends on | TASK-151 |
| Blocks | TASK-174 |
| Estimated | 4h |

---

## هدف

Regression test مرز timezone تهران برای MarkOverdue job.

---

## معیار پذیرش

- [ ] Due date yesterday Tehran → overdue
- [ ] Due date today Tehran → still pending
- [ ] UTC edge case documented

---

## مشخصات فنی

### Cases

| dueDate (Tehran) | Job run (Tehran) | Expected |
|------------------|------------------|----------|
| yesterday | today 00:05 | overdue |
| today | today 00:05 | pending |
| today | tomorrow 00:05 | overdue |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/scheduler/src/jobs/mark-overdue-installments.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Freeze time tests
2. Seed installment
3. Run job
4. Assert status

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Timezone DST | — | Asia/Tehran no DST — stable |

---

## تست

- [ ] Integration: Tehran boundary

---

## Policy Alignment

- [ ] Asia/Tehran
- [ ] Financial regression test

---

## مراجع

- `TASK-151`
- `TASK-077`

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
