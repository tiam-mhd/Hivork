# TASK-056: Soft Delete & Restore Use Cases

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-08-Core-Services |
| ID | TASK-056 |
| Priority | P0 |
| Depends on | TASK-046 (ISoftDeletableRepository port), TASK-047 (AuditService) |
| Blocks | TASK-054 |
| Estimated | 6h |

---

## هدف

Use cases عمومی (generic) برای soft delete و restore هر entity که `ISoftDeletableRepository` را پیاده کند — ADR-013. این use cases پایه recycle bin آینده هستند و برای Phase 0 روی `TenantCustomer` اعمال می‌شوند.

---

## معیار پذیرش

- [ ] `SoftDeleteEntityUseCase<TRecord>` generic — sets `deletedAt`, `deletedById`, `deleteReason?`, creates audit log
- [ ] `RestoreEntityUseCase<TRecord>` generic — clears `deletedAt`, `deletedById`, creates audit log
- [ ] `ListDeletedEntitiesUseCase<TRecord>` — paginated list با `limit` (1–100)
- [ ] هر عملیات یک audit log entry می‌نویسد: `entity.soft_delete` یا `entity.restore`
- [ ] Soft delete entity که already deleted → 409 `ALREADY_DELETED`
- [ ] Restore entity که not deleted → 409 `NOT_DELETED`
- [ ] Cross-tenant: entity از tenant دیگر → 404
- [ ] API endpoints برای TenantCustomer (Phase 0):
  - `DELETE /api/v1/customers/:id` → 204
  - `POST /api/v1/customers/:id/restore` → 200
  - `GET /api/v1/customers/recycle` → owner only

---

## مشخصات فنی

### ISoftDeletableRepository Port

```typescript
// packages/application/src/ports/soft-deletable.repository.port.ts
export type SoftDeletableRecord = {
  id: string;
  tenantId: string;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
};

export interface ISoftDeletableRepository<TRecord extends SoftDeletableRecord> {
  findActiveById(id: string, tenantId: string): Promise<TRecord | null>;
  findDeletedById(id: string, tenantId: string): Promise<TRecord | null>;
  softDelete(input: { id: string; tenantId: string; deletedById: string; deleteReason?: string }): Promise<TRecord>;
  restore(input: { id: string; tenantId: string; restoredById: string }): Promise<TRecord>;
  listDeleted(tenantId: string, limit: number): Promise<TRecord[]>;
}
```

### SoftDeleteEntityUseCase

```typescript
// packages/application/src/soft-delete/soft-delete-entity.use-case.ts
export class SoftDeleteEntityUseCase<TRecord extends SoftDeletableRecord> {
  constructor(
    private readonly repository: ISoftDeletableRepository<TRecord>,
    private readonly audit: AuditService,
    private readonly entityType: string,
    private readonly assertDeletable?: EntityDeletableGuard,
  ) {}

  async execute(input: SoftDeleteEntityInput): Promise<SoftDeleteEntityOutput> {
    if (this.assertDeletable) await this.assertDeletable(input.entityId, input.tenantId);

    const active = await this.repository.findActiveById(input.entityId, input.tenantId);
    if (!active) {
      const deleted = await this.repository.findDeletedById(input.entityId, input.tenantId);
      if (deleted) throw new ApplicationError('ALREADY_DELETED', ..., 409);
      throw new ApplicationError('NOT_FOUND', ..., 404);
    }

    const updated = await this.repository.softDelete({ ... });
    await this.audit.log({ action: 'entity.soft_delete', entityType: this.entityType, ... });
    return { id: updated.id, deletedAt: updated.deletedAt! };
  }
}
```

### RestoreEntityUseCase

```typescript
export class RestoreEntityUseCase<TRecord extends SoftDeletableRecord> {
  async execute(input: RestoreEntityInput): Promise<RestoreEntityOutput> {
    const deleted = await this.repository.findDeletedById(input.entityId, input.tenantId);
    if (!deleted) {
      const active = await this.repository.findActiveById(input.entityId, input.tenantId);
      if (active) throw new ApplicationError('NOT_DELETED', ..., 409);
      throw new ApplicationError('NOT_FOUND', ..., 404);
    }
    const restored = await this.repository.restore({ ... });
    await this.audit.log({ action: 'entity.restore', ... });
    return { id: restored.id, restoredAt: new Date() };
  }
}
```

### Permissions

| Action | Permission |
|--------|------------|
| soft delete customer | `core.customer.delete` |
| restore customer | `core.customer.restore` |
| list deleted (recycle bin) | `core.recycle.view` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/application/src/ports/soft-deletable.repository.port.ts` |
| Create/Update | `packages/application/src/soft-delete/soft-delete-entity.use-case.ts` |
| Create/Update | `packages/application/src/soft-delete/restore-entity.use-case.ts` |
| Create/Update | `packages/application/src/soft-delete/list-deleted-entities.use-case.ts` |
| Create/Update | `packages/application/src/soft-delete/soft-delete-restore.use-case.spec.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` (DELETE + restore + recycle endpoints) |

---

## مراحل پیاده‌سازی

1. تعریف `SoftDeletableRecord` و `ISoftDeletableRepository` port
2. پیاده‌سازی `SoftDeleteEntityUseCase` با assertDeletable guard
3. پیاده‌سازی `RestoreEntityUseCase`
4. پیاده‌سازی `ListDeletedEntitiesUseCase` با limit validation
5. Wire در `CustomersController`: DELETE → softDelete, POST restore, GET recycle
6. Unit tests با mock repository

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Entity already deleted | 409 | `ALREADY_DELETED` |
| Restore non-deleted entity | 409 | `NOT_DELETED` |
| Cross-tenant access | 404 | `NOT_FOUND` |
| Paid installment delete | 403 | `DELETE_FORBIDDEN` |
| `listDeleted` limit > 100 | 400 | `VALIDATION_ERROR` |

---

## تست

- [ ] Unit: `softDelete` → entity یافت می‌شود → audit log نوشته می‌شود
- [ ] Unit: `softDelete` → entity already deleted → 409 `ALREADY_DELETED`
- [ ] Unit: `restore` → entity not deleted → 409 `NOT_DELETED`
- [ ] Unit: `restore` → entity deleted → audit log `entity.restore`
- [ ] Integration: soft delete → `findActiveById` → null; `findDeletedById` → not null
- [ ] Integration: restore → `findActiveById` → not null
- [ ] Integration: cross-tenant — soft delete customer از tenant B توسط tenant A → 404

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — کامل (ADR-013)
- [ ] EXCELLENCE-STANDARDS §3 (audit، edge cases)
- [ ] ADR-013 (soft delete mandatory)

---

## مراجع

- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/09-development/ERROR-CODES.md` §7 (DATA_* codes)
- `docs/08-decisions/adr-log.md` — ADR-013

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | Port، هر سه use case، API، Files table، Steps |
| Policy | 25/25 | SOFT-DELETE-POLICY، ADR-013، audit اجباری |
| Executability | 25/25 | Code patterns، edge cases table، integration tests |
| Alignment | 14/15 | sync با soft-delete-restore.use-case.spec.ts |
| **جمع** | **99/100** | ≥95 ✅ |
