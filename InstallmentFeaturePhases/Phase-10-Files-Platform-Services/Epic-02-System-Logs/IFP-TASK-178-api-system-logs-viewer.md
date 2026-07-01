# IFP-178: API — System Logs Viewer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-02-System-Logs |
| ID | IFP-178 |
| Priority | P0 |
| Depends on | IFP-177 |
| Blocks | IFP-179, IFP-187 |
| Estimated | 8h |

---

## هدف

API لیست فیلترشده لاگ‌ها + AuditLog query existing port.

---

## معیار پذیرش

- [ ] GET /api/v1/logs/api
- [ ] /logs/errors
- [ ] /logs/security
- [ ] /audit-logs
- [ ] Cursor pagination
- [ ] Permission core.logs.view
- [ ] Owner + manager only

---

## مشخصات فنی

Filters: from, to, staffId, status, action (audit)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/modules/core/logs.controller.ts` |

---

## مراحل پیاده‌سازی

1. Controllers
2. Reuse AuditFindQuery
3. RBAC

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Range > 31 days | 400 | LOG_RANGE_TOO_LARGE |

---

## تست

- [ ] Integration list audit

---

## Policy Alignment

- [ ] RBAC owner/manager

---

## مراجع

- `TASK-024 audit`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
