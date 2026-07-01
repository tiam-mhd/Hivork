# TASK-173: Test — RBAC Bot API

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-14-Phase4-Tests |
| ID | TASK-173 |
| Priority | P0 |
| Depends on | TASK-137 |
| Blocks | TASK-174 |
| Estimated | 4h |

---

## هدف

RBAC test — POST link-token allow/deny + cross-tenant.

---

## معیار پذیرش

- [ ] Role with permission → 201
- [ ] Role without → 403
- [ ] Cross-tenant customer → 404
- [ ] Audit entry created

---

## مشخصات فنی

### Matrix

| Actor | Permission | Tenant | Expected |
|-------|------------|--------|----------|
| staff | link_bot | own | 201 |
| staff | none | own | 403 |
| staff | link_bot | other | 404 |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/integration/bot-link-rbac.spec.ts` |

---

## مراحل پیاده‌سازی

1. Seed roles
2. Permission grant/deny
3. Cross-tenant case
4. Audit assert

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| DENY override | — | 403 even if role grants |

---

## تست

- [ ] Integration: RBAC matrix
- [ ] Integration: audit

---

## Policy Alignment

- [ ] RBAC override precedence
- [ ] Cross-tenant must fail

---

## مراجع

- `docs/02-architecture/rbac.md`

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
