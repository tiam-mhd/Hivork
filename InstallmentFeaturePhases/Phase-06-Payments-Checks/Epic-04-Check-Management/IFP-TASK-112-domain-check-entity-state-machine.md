# IFP-TASK-112: Domain — Check Entity + State Machine

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-04-Check-Management |
| ID | IFP-TASK-112 |
| Priority | P0 |
| Depends on | IFP-TASK-111 |
| Blocks | IFP-TASK-113, IFP-TASK-114, IFP-TASK-115, IFP-TASK-116 |
| Estimated | 6h |

---

## هدف

Entity **`Check`** و state machine در `packages/domain/payments/` — transitions: registered → due → collected/bounced/transferred/cancelled — بدون framework imports.

---

## معیار پذیرش

- [ ] `Check` entity با methods: `markDue`, `collect`, `bounce`, `transfer`, `cancel`
- [ ] Invalid transitions → `CheckTransitionError`
- [ ] `collected` و `bounced` terminal (no further except cancel admin)
- [ ] `dueDate` passed → eligible `markDue` (scheduler hook)
- [ ] Unit tests ≥ 15 covering all transitions
- [ ] Document state diagram in task + sync `state-machines.md`

---

## مشخصات فنی

### State machine

```
REGISTERED → DUE (due date reached or manual)
DUE → COLLECTED | BOUNCED | TRANSFERRED | CANCELLED
REGISTERED → CANCELLED (before collect)
BOUNCED → (terminal) — new payment required for installment
TRANSFERRED → (terminal)
COLLECTED → (terminal)
```

### Entity methods

```typescript
export class Check {
  collect(staffId: StaffId, at: DateTime): void {
    if (!['registered', 'due'].includes(this.status))
      throw new CheckTransitionError('CHECK_STATUS_INVALID');
    this.status = 'collected';
    this.collectedAt = at;
  }

  bounce(staffId: StaffId, reason: string, at: DateTime): void {
    if (this.status !== 'due') throw new CheckTransitionError('CHECK_NOT_DUE');
    this.status = 'bounced';
    this.bounceReason = reason;
    this.bouncedAt = at;
  }

  transfer(transferredTo: string, staffId: StaffId, at: DateTime): void {
    if (!['registered', 'due'].includes(this.status))
      throw new CheckTransitionError('CHECK_STATUS_INVALID');
    this.status = 'transferred';
    this.transferredTo = transferredTo;
    this.transferredAt = at;
  }
}
```

### Unit test matrix

| From | Action | To | Allowed |
|------|--------|-----|---------|
| registered | collect | collected | ✓ |
| registered | bounce | bounced | ✗ |
| due | bounce | bounced | ✓ |
| collected | bounce | — | ✗ |
| bounced | collect | — | ✗ |
| due | transfer | transferred | ✓ |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/src/payments/check.entity.ts` |
| Create | `packages/domain/src/payments/errors/check.errors.ts` |
| Create | `packages/domain/src/payments/check.entity.spec.ts` |
| Update | `docs/03-modules/installments/state-machines.md` — Check §new |

---

## مراحل پیاده‌سازی

1. Define CheckStatus type in domain
2. Entity with transition methods
3. markDue for scheduler
4. 15+ unit tests
5. Update state-machines.md

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Bounce before due | `CHECK_NOT_DUE` | throw |
| Collect bounced | `CHECK_STATUS_INVALID` | throw |
| Cancel collected | `CHECK_STATUS_INVALID` | throw |

---

## تست

- [ ] Unit: full transition matrix
- [ ] Unit: bigint amount invariant > 0

---

## UX

N/A — domain.

---

## Flow

```
Register → (time) → due → collect OR bounce OR transfer
```

---

## Policy Alignment

- [ ] Domain purity
- [ ] ADR-008 style terminal states
- [ ] SOFT-DELETE — cancel ≠ hard delete

---

## مراجع

- `docs/01-product/installment-module-features.md` §۷
- IFP-TASK-111

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 15+ tests |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | state table |
| Alignment | 15 | 15 | §۷ |
| **جمع** | **100** | **100** | ≥95 ✅ |
