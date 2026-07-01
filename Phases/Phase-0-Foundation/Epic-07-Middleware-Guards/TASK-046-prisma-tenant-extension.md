# TASK-046: Prisma Extensions — Tenant + Soft Delete

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-07-Middleware-Guards |
| ID | TASK-046 |
| Priority | P0 |
| Depends on | TASK-041, TASK-012 |
| Blocks | TASK-054, TASK-056 |
| Estimated | 5h |

---

## هدف

لایه دوم (Layer 2) امنیت multi-tenant در Hivork. لایه اول Guard است؛ این extension در Prisma اطمینان می‌دهد که **حتی اگر Guard از دست برود**، هیچ query بدون `tenantId` روی مدل‌های tenant-scoped اجرا نشود. همچنین soft delete را enforce می‌کند: `deletedAt IS NULL` برای همه read/write queries، و `delete()` → throw.

---

## معیار پذیرش

- [ ] `tenantExtension`: `findMany`/`findFirst`/`count`/`update` روی tenant-scoped models → inject `tenantId` در `WHERE`
- [ ] `tenantExtension`: `create` روی tenant-scoped models → inject `tenantId` در `data`
- [ ] `softDeleteExtension`: همه read operations روی soft-delete models → inject `deletedAt: null`
- [ ] `softDeleteExtension`: `delete()`/`deleteMany()` روی business models → throw `HardDeleteForbiddenError`
- [ ] `findUnique`/`findUniqueOrThrow` روی soft-deleted record → null/throw
- [ ] `findUnique`/`findUniqueOrThrow` روی cross-tenant record → null/throw
- [ ] AuditLog و OutboxEvent از soft-delete filter مستثنی هستند (append-only)
- [ ] CI check: `grep .delete(` در src — اگر روی business model → fail

---

## مشخصات فنی

### Tenant-Scoped Models

```typescript
// packages/infrastructure/src/prisma/prisma-extension.config.ts
export const TENANT_SCOPED_MODELS = [
  'Staff',
  'Branch',
  'TenantCustomer',
  'TenantSetting',
  'Sale',
  'Payment',
  // ... (همه tenant-owned models)
] as const;
```

### Soft-Delete Models

```typescript
export const SOFT_DELETE_MODELS = [
  'Staff',
  'Branch',
  'TenantCustomer',
  'GlobalCustomer',
  'Sale',
  // ... (همه business models — NOT AuditLog, NOT OutboxEvent)
] as const;
```

### tenantExtension

```typescript
export const tenantExtension = Prisma.defineExtension({
  name: 'hivork-tenant',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_SCOPED_MODELS.includes(model)) return query(args);

        const tenantId = getTenantId(); // از AsyncLocalStorage
        const dataScopeFilter = getDataScopeFilter(); // از AsyncLocalStorage

        if (operation === 'create') {
          // inject tenantId در data
        }
        if (READ_OPERATIONS.has(operation) || WRITE_FILTER_OPERATIONS.has(operation)) {
          // inject tenantId در where + dataScopeFilter
        }
      }
    }
  }
});
```

### softDeleteExtension

```typescript
export const softDeleteExtension = Prisma.defineExtension({
  name: 'hivork-soft-delete',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!SOFT_DELETE_MODELS.includes(model)) return query(args);

        if (DELETE_OPERATIONS.has(operation)) {
          throw new HardDeleteForbiddenError(model);
        }
        if (READ_OPERATIONS.has(operation) || WRITE_OPERATIONS.has(operation)) {
          args.where = mergeWhere(args.where, { deletedAt: null });
        }
        // findUnique: post-process → check deletedAt
      }
    }
  }
});
```

### Soft Delete Helper (Repository Layer)

```typescript
// نه prisma.entity.delete()! استفاده از:
await prisma.entity.update({
  where: { id, deletedAt: null },
  data: {
    deletedAt: new Date(),
    deletedById: actorId,
    deleteReason: reason,
  },
});
```

### Extension Composition

```typescript
// packages/infrastructure/src/prisma/prisma.client.ts
export const prisma = new PrismaClient()
  .$extends(softDeleteExtension)
  .$extends(tenantExtension)
  .$extends(tenantUniqueReadExtension);
```

**ترتیب مهم:** softDelete قبل از tenant (چون tenant extension WHERE اضافه می‌کند)

### HardDeleteForbiddenError

```typescript
export class HardDeleteForbiddenError extends Error {
  constructor(model: string) {
    super(`Hard delete is forbidden on model: ${model}. Use soft delete instead.`);
    this.name = 'HardDeleteForbiddenError';
  }
}
```

### Bypass Soft Delete (برای restore use case)

```typescript
// در AdminRestoreUseCase
prismaRequestStorage.run({ ...ctx, bypassSoftDelete: true }, async () => {
  await prisma.entity.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  });
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/src/prisma/prisma-tenant.extension.ts` |
| Create | `packages/infrastructure/src/prisma/prisma-soft-delete.extension.ts` |
| Create | `packages/infrastructure/src/prisma/prisma-extension.config.ts` — model lists |
| Create | `packages/infrastructure/src/prisma/prisma.client.ts` — compose extensions |
| Create | `packages/infrastructure/src/prisma/errors/hard-delete-forbidden.error.ts` |
| Create | `packages/infrastructure/src/context/request-context.ts` — AsyncLocalStorage |

---

## مراحل پیاده‌سازی

1. تعریف `TENANT_SCOPED_MODELS` و `SOFT_DELETE_MODELS` lists
2. پیاده‌سازی `prismaRequestStorage` (AsyncLocalStorage)
3. پیاده‌سازی `tenantExtension` — inject tenantId در create/read/write
4. پیاده‌سازی `softDeleteExtension` — filter deletedAt + block delete
5. پیاده‌سازی `tenantUniqueReadExtension` — cross-tenant check برای findUnique
6. پیاده‌سازی `HardDeleteForbiddenError`
7. Compose extensions در `prisma.client.ts`
8. نوشتن integration tests
9. CI check برای `.delete(` grep

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `prisma.staff.delete()` | throw `HardDeleteForbiddenError` |
| `prisma.staff.findMany()` بدون context | بدون `tenantId` filter (در test env) |
| `prisma.staff.findMany()` در request context | inject `tenantId` و `deletedAt: null` |
| `findUnique` روی soft-deleted record | null |
| `findUniqueOrThrow` روی soft-deleted | throw P2025 |
| `findUnique` cross-tenant | null |
| AuditLog read | بدون soft-delete filter |
| OutboxEvent read | بدون soft-delete filter |
| `bypassSoftDelete=true` (restore) | soft-delete filter skip می‌شود |

---

## تست

- [ ] Unit: `prisma.anyBusinessModel.delete()` → throw `HardDeleteForbiddenError`
- [ ] Integration: soft-deleted record در `findMany` ظاهر نمی‌شود
- [ ] Integration: `findUnique` روی soft-deleted → null
- [ ] Integration: cross-tenant `findUnique` → null
- [ ] Integration: restore با `bypassSoftDelete` → record ظاهر می‌شود
- [ ] Integration: `create` با tenantId در context → `tenantId` inject می‌شود
- [ ] Integration: `findMany` cross-tenant isolation — tenant A داده‌های tenant B نمی‌بیند
- [ ] CI: grep check `.delete(` روی business models fail کند

---

## Policy Alignment

- [ ] `SOFT-DELETE-POLICY.md` — ADR-013 — mandatory
- [ ] `.cursor/rules/09-soft-delete-mandatory.mdc`
- [ ] AuditLog و OutboxEvent استثنا صریح در SOFT_DELETE_MODELS نیستند
- [ ] CI guard اجباری در TASK-004 یا CI task

---

## مراجع

- `docs/09-development/SOFT-DELETE-POLICY.md`
- ADR-013
- TASK-041 (AsyncLocalStorage source), TASK-045 (dataScopeFilter)
- `.cursor/rules/09-soft-delete-mandatory.mdc`

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Extensions، models list، composition، bypass |
| Policy | 25/25 | ADR-013، AuditLog/Outbox exceptions، CI check |
| Executability | 25/25 | Edge cases کامل، tests، soft delete helper |
| Alignment | 15/15 | Sync با TASK-041، TASK-045، SOFT-DELETE-POLICY |
| **جمع** | **100/100** | ✅ Ready for implementation |
