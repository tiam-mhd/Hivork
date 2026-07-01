# TASK-073: Use Case — CancelSale

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-05-Installments-Use-Cases |
| ID | TASK-073 |
| Priority | P0 |
| Depends on | TASK-065, TASK-066, TASK-068, TASK-072, TASK-047 |
| Blocks | TASK-080, TASK-120 |
| Estimated | 6h |

---

## هدف

`CancelSaleUseCase` — لغو فروش active با اعمال BR-011 تا BR-013 در domain، به‌روزرسانی وضعیت اقساط pending/overdue به cancelled (logical — sale cancelled)، audit `sale.cancel`، و reject اگر قسط paid وجود دارد.

---

## معیار پذیرش

- [ ] `CancelSaleUseCase.execute(saleId, reason, staffContext)`
- [ ] فقط sale با status `active` — BR-011 → `SALE_ALREADY_CANCELLED` / `SALE_ALREADY_COMPLETED`
- [ ] بدون installment با status `paid` — BR-012 → `SALE_HAS_PAID_INSTALLMENT`
- [ ] overdue/waived installments مانع لغو نیستند — BR-013
- [ ] Sale `cancel()` domain method + persist در transaction
- [ ] Pending/overdue installments: remain in DB؛ sale status drives visibility (cancelled sale → installments not actionable)
- [ ] Audit `sale.cancel` با `{ saleId, reason }`
- [ ] Data scope: staff must access sale's branch (ADR-015)
- [ ] Cross-tenant saleId → `SALE_NOT_FOUND` (404)
- [ ] Soft-deleted sale → `SALE_NOT_FOUND`
- [ ] Return `{ status: 'cancelled', cancelledAt }`

---

## مشخصات فنی

### Input

```typescript
export type CancelSaleInput = {
  tenantId: string;
  actorId: string;
  saleId: string;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
};
```

### Logic

```typescript
async execute(input: CancelSaleInput): Promise<CancelSaleResult> {
  return this.unitOfWork.transaction(async (tx) => {
    const sale = await this.saleRepo.findById(input.tenantId, input.saleId, tx);
    if (!sale || sale.deletedAt) throw new NotFoundError('SALE_NOT_FOUND');

    this.assertSaleInScope(sale, input.staffContext); // ADR-015

    const installments = await this.installmentRepo.findBySaleId(input.tenantId, input.saleId, tx);
    const snapshots = installments.map(i => ({ status: i.status }));

    sale.cancel(input.reason, input.actorId, snapshots); // BR-011–013

    await this.saleRepo.update(sale, tx);

    await this.audit.log({
      action: 'sale.cancel',
      entity: 'Sale',
      entityId: sale.id,
      tenantId: input.tenantId,
      actorId: input.actorId,
      oldValue: { status: 'active' },
      newValue: { status: 'cancelled', reason: input.reason },
      ip: input.ip,
    }, tx);

    return { status: 'cancelled' as const, cancelledAt: sale.cancelledAt! };
  });
}
```

### Error Codes

| سناریو | HTTP | Code |
|--------|------|------|
| Sale not found / wrong tenant | 404 | `SALE_NOT_FOUND` |
| Already cancelled | 409 | `SALE_ALREADY_CANCELLED` |
| Already completed | 409 | `SALE_ALREADY_COMPLETED` |
| Has paid installment | 409 | `SALE_HAS_PAID_INSTALLMENT` |
| Outside data scope | 404 | `SALE_NOT_FOUND` |
| Reason < 3 chars | 400 | `FIELD_REQUIRED` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/sales/cancel-sale.use-case.ts` |
| Create | `packages/application/src/installments/sales/cancel-sale.use-case.spec.ts` |
| Update | `packages/application/src/ports/sale.repository.port.ts` |

---

## مراحل پیاده‌سازی

1. Load sale + installments in transaction
2. Assert data scope (branch/own)
3. Call domain `sale.cancel()`
4. Persist sale update
5. Audit log
6. Unit tests: each BR-011–013 case
7. Integration test with paid installment → 409

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Only waived installments | 200 | allowed BR-013 |
| Mix overdue + pending, no paid | 200 | allowed |
| One paid installment | 409 | `SALE_HAS_PAID_INSTALLMENT` |
| Staff own scope, other seller's sale | 404 | scope mask |
| Cancel twice | 409 | second call |

---

## تست

- [ ] Unit: cancel active sale no paid → success
- [ ] Unit: cancel with paid installment → `SALE_HAS_PAID_INSTALLMENT`
- [ ] Unit: cancel already cancelled → `SALE_ALREADY_CANCELLED`
- [ ] Unit: cancel completed sale → `SALE_ALREADY_COMPLETED`
- [ ] Unit: cancel with only overdue → success
- [ ] Unit: cross-tenant saleId → `SALE_NOT_FOUND`
- [ ] Integration: audit row created
- [ ] Integration: sale status cancelled in DB

---

## UX

N/A — TASK-111 sale detail cancel action.

---

## Flow

```
Entry: POST /sales/:id/cancel { reason }
  → Load sale + installments
  → Scope check
  → domain cancel() BR-011–013
  → persist + audit
Exit: { status: cancelled, cancelledAt }
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 — audit mandatory
- [ ] SOFT-DELETE-POLICY — cancel not delete
- [ ] ADR-013 — paid installments never deleted
- [ ] ADR-015 — data scope
- [ ] BUSINESS-RULES BR-011, BR-012, BR-013

---

## مراجع

- `docs/03-modules/installments/BUSINESS-RULES.md` — BR-011 to BR-013
- `docs/03-modules/installments/state-machines.md` § Sale
- `docs/02-architecture/api-contracts.md` § POST cancel
- `Phases/Phase-1-Seller-Panel/Epic-03-Installments-Domain/TASK-065-domain-sale-entity.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | Logic، errors، audit |
| Policy | 25 | 25 | BR-011–013، soft delete |
| Executability | 25 | 25 | 8 tests |
| Alignment | 15 | 15 | TASK-065 cancel() |
| **جمع** | **100** | **100** | ≥95 ✅ |
