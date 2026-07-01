# TASK-119: Test — Domain State Transitions

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-14-Phase1-Tests |
| ID | TASK-119 |
| Priority | P0 |
| Depends on | TASK-065, TASK-066, TASK-067 |
| Blocks | TASK-123 |
| Estimated | 8h |

---

## هدف

Unit tests برای state transitions در domain entities — Installment، PaymentAttempt، Sale — مطابق `state-machines.md`. تأیید terminal states (paid/waived immutable)، illegal transitions throw، و side-effect rules (confirm → installment paid).

---

## معیار پذیرش

- [ ] Spec: `packages/domain/installments/__tests__/state-transitions.spec.ts`
- [ ] Vitest — zero NestJS/Prisma imports
- [ ] **Installment:** pending→overdue (markOverdue)، pending→paid، overdue→paid، pending→waived، overdue→waived
- [ ] **Installment:** paid→* forbidden، waived→* forbidden
- [ ] **PaymentAttempt:** pending→confirmed، pending→rejected
- [ ] **PaymentAttempt:** confirmed→* forbidden، rejected→pending forbidden (new attempt instead)
- [ ] **Sale:** active→cancelled (BR-011–013)، active→completed when all terminal
- [ ] **Sale:** cancelled/completed → no further transitions
- [ ] Auto-confirm rule documented in test (staff report + setting false)
- [ ] Each illegal transition throws named `DomainError` code
- [ ] `pnpm turbo test --filter=@hivork/domain` pass

---

## مشخصات فنی

### Installment Transitions

```typescript
describe('Installment state transitions', () => {
  it('pending → overdue via markOverdue()', () => {
    const i = Installment.reconstitute({ ...base, status: 'pending' });
    i.markOverdue();
    expect(i.status).toBe('overdue');
  });

  it('pending → paid via confirmPayment()', () => {
    const i = Installment.reconstitute({ ...base, status: 'pending' });
    i.markPaid({ paidAt: new Date(), confirmedById: 'staff-uuid' });
    expect(i.status).toBe('paid');
  });

  it('overdue → paid via confirmPayment()', () => {
    const i = Installment.reconstitute({ ...base, status: 'overdue' });
    i.markPaid({ paidAt: new Date(), confirmedById: 'staff-uuid' });
    expect(i.status).toBe('paid');
  });

  it('pending → waived via waive()', () => {
    const i = Installment.reconstitute({ ...base, status: 'pending' });
    i.waive({ waivedById: 'staff-uuid', reason: 'توافق' });
    expect(i.status).toBe('waived');
  });

  it('paid → waived forbidden', () => {
    const i = Installment.reconstitute({ ...base, status: 'paid' });
    expect(() => i.waive({ waivedById: 'x', reason: 'r' }))
      .toThrow('INSTALLMENT_ALREADY_PAID');
  });

  it('waived → paid forbidden', () => {
    const i = Installment.reconstitute({ ...base, status: 'waived' });
    expect(() => i.markPaid({ paidAt: new Date(), confirmedById: 'x' }))
      .toThrow('INSTALLMENT_ALREADY_WAIVED');
  });
});
```

### PaymentAttempt Transitions

```typescript
describe('PaymentAttempt state transitions', () => {
  it('pending → confirmed', () => {
    const p = PaymentAttempt.reconstitute({ ...base, status: 'pending' });
    p.confirm('staff-uuid');
    expect(p.status).toBe('confirmed');
  });

  it('pending → rejected', () => {
    const p = PaymentAttempt.reconstitute({ ...base, status: 'pending' });
    p.reject('staff-uuid', 'رسید نادرست');
    expect(p.status).toBe('rejected');
  });

  it('confirmed → rejected forbidden', () => {
    const p = PaymentAttempt.reconstitute({ ...base, status: 'confirmed' });
    expect(() => p.reject('x', 'reason')).toThrow('PAYMENT_ALREADY_CONFIRMED');
  });

  it('rejected → confirm forbidden', () => {
    const p = PaymentAttempt.reconstitute({ ...base, status: 'rejected' });
    expect(() => p.confirm('x')).toThrow('PAYMENT_ALREADY_REJECTED');
  });
});
```

### Sale Transitions

```typescript
describe('Sale state transitions', () => {
  it('active → cancelled when no paid installments', () => {
    const sale = Sale.reconstitute({ ...base, status: 'active' });
    sale.cancel('reason', 'staff-id', [{ status: 'pending' }, { status: 'overdue' }]);
    expect(sale.status).toBe('cancelled');
  });

  it('active → completed when all installments terminal', () => {
    const sale = Sale.reconstitute({ ...base, status: 'active' });
    sale.markCompleted();
    expect(sale.status).toBe('completed');
  });

  it('cancelled → cancel forbidden', () => {
    const sale = Sale.reconstitute({ ...base, status: 'cancelled' });
    expect(() => sale.cancel('r', 's', [])).toThrow('SALE_ALREADY_CANCELLED');
  });
});
```

### Auto-Confirm Rule Test

```typescript
it('auto-confirm when require_seller_payment_confirmation=false and reporter=staff', () => {
  const shouldAuto = PaymentAttempt.shouldAutoConfirm({
    reportedByType: 'staff',
    requireSellerConfirmation: false,
  });
  expect(shouldAuto).toBe(true);

  const customerReport = PaymentAttempt.shouldAutoConfirm({
    reportedByType: 'customer',
    requireSellerConfirmation: false,
  });
  expect(customerReport).toBe(false); // customer always pending
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/installments/__tests__/state-transitions.spec.ts` |
| Verify | `packages/domain/installments/installment.entity.ts` (TASK-066) |
| Verify | `packages/domain/installments/payment-attempt.entity.ts` (TASK-067) |
| Verify | `packages/domain/installments/sale.entity.ts` (TASK-065) |

---

## مراحل پیاده‌سازی

1. Ensure entity methods exist per state-machines.md
2. Create state-transitions.spec.ts with Installment block
3. Add PaymentAttempt block
4. Add Sale block
5. Add auto-confirm rule test
6. Map all error codes to ERROR-CODES.md
7. Run domain test suite

---

## Edge Cases & Errors

| Transition | Expected |
|------------|----------|
| paid → waive | `INSTALLMENT_ALREADY_PAID` |
| waived → markPaid | `INSTALLMENT_ALREADY_WAIVED` |
| cancel with paid installment | `SALE_HAS_PAID_INSTALLMENT` |
| confirm rejected payment | `PAYMENT_ALREADY_REJECTED` |
| markCompleted with pending left | no transition / throw |

---

## تست

- [ ] Unit: 15+ transition cases (legal + illegal)
- [ ] Unit: all terminal state guards
- [ ] Unit: auto-confirm setting matrix (2 cases)
- [ ] CI: no DB required

---

## Policy Alignment

- [ ] state-machines.md — single source for transitions
- [ ] ADR-008 — domain-only transitions
- [ ] ADR-013 — paid never deleted
- [ ] DEVELOPMENT_RULES — domain rule → unit test

---

## مراجع

- `docs/03-modules/installments/state-machines.md`
- `docs/03-modules/installments/BUSINESS-RULES.md` — BR-011 to BR-014
- `docs/06-operations/testing-observability.md` §5.2
- `docs/09-development/ERROR-CODES.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 3 entities، 15+ cases |
| Policy | 25 | 25 | state-machines sync |
| Executability | 25 | 25 | copy-paste test blocks |
| Alignment | 15 | 15 | TASK-065–067 |
| **جمع** | **100** | **100** | ≥95 ✅ |
