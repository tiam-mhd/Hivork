# IFP-171: Phase 09 — Integration & Vertical Slice Tests

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-05-Phase09-Tests |
| ID | IFP-171 |
| Priority | P0 |
| Depends on | IFP-165, IFP-170 |
| Blocks | — |
| Estimated | 12h |

---

## هدف

E2E/integration: گروه staff، RBAC UI APIs، store settings patch — gate خروج فاز ۹.

---

## معیار پذیرش

- [ ] Integration: staff group CRUD + member add/remove
- [ ] Integration: custom role + permission override deny precedence
- [ ] Integration: store settings patch + audit log entry
- [ ] Integration: login log recorded on auth
- [ ] RBAC: cross-tenant fail all new endpoints
- [ ] CI: prisma validate + no hard delete grep
- [ ] Testcontainers PG

---

## مشخصات فنی

### Test suite
`packages/application/src/__tests__/phase09/`
`apps/api/test/phase09.e2e-spec.ts`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/phase09-users-settings.e2e-spec.ts` |
| Create | `packages/application/src/__tests__/phase09/` |

---

## مراحل پیاده‌سازی

1. Seed tenant + owner
2. Run slice scenarios
3. Add to CI workflow

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Flaky auth | — | Deterministic OTP test double |

---

## تست

- [ ] All above — this IS the test task

---

## Policy Alignment

- [ ] DEVELOPMENT_RULES testing
- [ ] 06-testing-quality.mdc

---

## مراجع

- `docs/06-operations/testing-observability.md`

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
