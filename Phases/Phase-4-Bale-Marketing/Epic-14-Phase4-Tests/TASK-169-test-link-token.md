# TASK-169: Test — Link Token One-Time

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-14-Phase4-Tests |
| ID | TASK-169 |
| Priority | P0 |
| Depends on | TASK-137, TASK-142 |
| Blocks | TASK-174 |
| Estimated | 5h |

---

## هدف

Integration test — token one-time consume و link موفق.

---

## معیار پذیرش

- [ ] Testcontainers PG + Redis
- [ ] Generate token → consume → second consume fails
- [ ] BotIdentity created after simulate link
- [ ] Cross-tenant token rejected

---

## مشخصات فنی

### Test cases

```typescript
describe('Bot link token one-time', () => {
  it('consumes token once');
  it('rejects reused token');
  it('creates BotIdentity');
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/integration/bot-link-token.spec.ts` |

---

## مراحل پیاده‌سازی

1. Fixture tenant+customer
2. API generate token
3. Simulate link use case
4. Assert DB state

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Expired TTL | — | reject in test with mocked time |

---

## تست

- [ ] Integration: full link flow
- [ ] Integration: cross-tenant

---

## Policy Alignment

- [ ] Testcontainers
- [ ] describe.runIf(hasDatabase)

---

## مراجع

- `docs/06-operations/testing-observability.md`

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
