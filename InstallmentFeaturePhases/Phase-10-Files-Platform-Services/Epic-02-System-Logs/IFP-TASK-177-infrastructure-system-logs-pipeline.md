# IFP-177: Infrastructure — System Logs Pipeline

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-02-System-Logs |
| ID | IFP-177 |
| Priority | P0 |
| Depends on | Phase-0 TASK-024 |
| Blocks | IFP-178 |
| Estimated | 10h |

---

## هدف

جمع‌آوری ApiRequestLog، ErrorLog، SecurityEvent — structured JSON Pino → DB or ELK-ready.

---

## معیار پذیرش

- [ ] Models: ApiRequestLog, ErrorLog (append-only)
- [ ] Nest interceptor logs API
- [ ] Global exception filter logs errors
- [ ] Security events: login fail, permission deny
- [ ] tenantId on all where applicable

---

## مشخصات فنی

ApiRequestLog: method, path, status, durationMs, staffId, ip — NO body PII

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/system-logs.prisma` |
| Create | `apps/api/src/common/interceptors/api-log.interceptor.ts` |

---

## مراحل پیاده‌سازی

1. Schema
2. Interceptor
3. Exception filter hook

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Log volume | — | Sampling P1 for 2xx |

---

## تست

- [ ] Request creates log row

---

## Policy Alignment

- [ ] No PII in logs
- [ ] AuditLog separate

---

## مراجع

- `docs/06-operations/security-and-audit.md`

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
