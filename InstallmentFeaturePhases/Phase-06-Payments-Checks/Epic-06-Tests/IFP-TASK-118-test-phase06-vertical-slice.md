# IFP-TASK-118: Integration + E2E — Vertical Slice فاز ۰۶

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-06-Tests |
| ID | IFP-TASK-118 |
| Priority | P0 |
| Depends on | IFP-TASK-101, IFP-TASK-102, IFP-TASK-103, IFP-TASK-104, IFP-TASK-105, IFP-TASK-106, IFP-TASK-107, IFP-TASK-108, IFP-TASK-109, IFP-TASK-110, IFP-TASK-111, IFP-TASK-112, IFP-TASK-113, IFP-TASK-114, IFP-TASK-115, IFP-TASK-116, IFP-TASK-117 |
| Blocks | — |
| Estimated | 10h |

---

## هدف

**Vertical slice test** فاز ۰۶ — ledger، unified payment، refund، settlement/reconciliation، چرخه کامل چک — با Testcontainers، RBAC و cross-tenant isolation.

---

## معیار پذیرش

- [ ] Suite `phase06-vertical-slice.integration.spec.ts`
- [ ] Scenario A: unified cash payment → confirm → ledger entry listed
- [ ] Scenario B: refund full → amount regression
- [ ] Scenario C: settlement create → close → void blocked
- [ ] Scenario D: reconciliation CSV → discrepancies → resolve
- [ ] Scenario E: check received → due → collect → ledger
- [ ] Scenario F: check bounce → installment not auto-waived
- [ ] Cross-tenant deny on all new endpoints
- [ ] RBAC matrix ≥ 8 endpoints
- [ ] CI includes suite; passes < 150s
- [ ] Phase-05 suite still green (no regression)

---

## مشخصات فنی

### Harness

```typescript
// packages/application/test/phase06-vertical-slice.integration.spec.ts
// Depends on phase05-seed.helper extended with ledger settings
```

### Scenario A

```
1. POST /api/v1/payments { method: cash, ... }  (IFP-105)
2. POST confirm payment
3. GET /api/v1/payments/transactions → entry posted
4. Assert ledger amountRial === payment amount
5. Assert audit: payment.report, payment.confirm
```

### Scenario B (financial regression)

```
1. Confirm payment 10_000_000n Rial
2. POST refund full
3. Assert refund entry DEBIT 10_000_000n
4. Assert installment not paid
```

### Scenario C

```
1. Create settlement batch with POS entries
2. Close batch
3. POST void ledger → 409 SETTLEMENT_LOCKED
```

### Scenario D

```
1. Close settlement
2. POST reconcile with fixture CSV (1 mismatch)
3. POST resolve discrepancy
4. Assert status RESOLVED + audit reconciliation.resolve
```

### Scenario E (check lifecycle)

```
1. POST /checks/received
2. Scheduler/manual mark due
3. POST collect → ledger + optional confirm
4. Assert check COLLECTED
```

### Scenario F

```
1. Register received check linked to installment
2. Mark due → POST bounce
3. Assert installment status !== waived
4. Assert pending payment attempt rejected if existed
```

### RBAC sample

| Endpoint | Permission |
|----------|------------|
| GET transactions | installments.payment.read |
| POST refund | installments.payment.refund |
| POST settlement | installments.settlement.manage |
| POST checks/received | installments.check.create |
| POST bounce | installments.check.bounce |

### CI

```yaml
- name: Phase 06 vertical slice
  run: pnpm --filter @hivork/application test:integration -- phase06-vertical-slice
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/test/phase06-vertical-slice.integration.spec.ts` |
| Create | `packages/application/test/fixtures/bank-statement-sample.csv` |
| Create | `packages/application/test/helpers/phase06-seed.helper.ts` |
| Update | `.github/workflows/test.yml` |
| Update | `package.json` — `test:integration:phase06` |

---

## مراحل پیاده‌سازی

1. Extend seed helper for payment method settings
2. Implement scenarios A–F
3. RBAC + cross-tenant subtests
4. Fixture CSV for reconciliation
5. Wire CI
6. Update Phase-06 README exit criteria checkbox

---

## Edge Cases & Errors

| سناریو | Assertion |
|--------|-----------|
| Idempotent unified payment | same Idempotency-Key |
| Partial refund | installment partial state |
| Collect idempotent | second collect 409 |

---

## تست

- [ ] Integration: Scenario A–F pass
- [ ] Integration: cross-tenant 404/403
- [ ] Integration: RBAC deny matrix
- [ ] CI green on PR
- [ ] Phase-05 suite regression pass

---

## UX

N/A — test task.

---

## Flow

```
CI → PG container → migrate → seed phase05+06 → run scenarios → teardown
```

---

## Policy Alignment

- [ ] Testcontainers required
- [ ] Financial regression refund amount
- [ ] Check bounce installment rule
- [ ] Cross-tenant isolation
- [ ] No prisma.delete on business models in code under test

---

## مراجع

- `docs/06-operations/testing-observability.md`
- Phase-06 README Exit Criteria
- IFP-TASK-100 patterns

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 6 scenarios |
| Policy | 25 | 25 | RBAC + tenant |
| Executability | 25 | 25 | CI + fixtures |
| Alignment | 15 | 15 | exit criteria |
| **جمع** | **100** | **100** | ≥95 ✅ |
