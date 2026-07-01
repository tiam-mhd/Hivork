# TASK-030: Domain Entity — Branch

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-05-Domain-Core |
| ID | TASK-030 |
| Priority | P0 |
| Depends on | TASK-029 |
| Blocks | TASK-031, TASK-054, TASK-057 |
| Estimated | 3h |

---

## هدف

پیاده‌سازی `Branch` domain entity — ایجاد شعبه، rename، deactivate، soft delete. شعبه پیش‌فرض (`isDefault=true`) نمی‌تواند حذف یا deactivate شود (ADR-009). Entity خالص TypeScript بدون Prisma/NestJS.

---

## معیار پذیرش

- [ ] کلاس `Branch` با `static create()` و `static createDefault()` و `static reconstitute()`
- [ ] Methods: `rename(name)`, `deactivate()`, `softDelete(deletedById, reason?)`, `restore()`
- [ ] Getters: `id`, `tenantId`, `name`, `address`, `isDefault`, `isActive`, `deletedAt`, `deletedById`, `isDeleted`
- [ ] `deactivate()` روی isDefault=true → `CANNOT_DEACTIVATE_DEFAULT_BRANCH`
- [ ] `softDelete()` روی isDefault=true → `DELETE_FORBIDDEN`
- [ ] `softDelete()` روی already deleted → `ALREADY_DELETED`
- [ ] `restore()` روی not deleted → `NOT_DELETED`
- [ ] Name validation: حداقل 2 کاراکتر
- [ ] `createDefault()` → name='شعبه اصلی'، isDefault=true، isActive=true
- [ ] فایل spec با ≥5 test case
- [ ] هیچ import از Prisma/NestJS

---

## مشخصات فنی

### Interface

```typescript
const DEFAULT_BRANCH_NAME = 'شعبه اصلی';

export class Branch {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    private _name: string,
    private _address: string | null,
    readonly isDefault: boolean,
    private _isActive: boolean,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  static create(props: {
    tenantId: string; name: string; address?: string | null; isDefault?: boolean;
  }): Branch;

  static createDefault(tenantId: string): Branch;

  static reconstitute(props: {
    id: string; tenantId: string; name: string; address: string | null;
    isDefault: boolean; isActive: boolean;
    deletedAt: Date | null; deletedById: string | null;
  }): Branch;

  rename(name: string): void;
  deactivate(): void;     // throws CANNOT_DEACTIVATE_DEFAULT_BRANCH
  softDelete(deletedById: string, reason?: string): void;  // throws DELETE_FORBIDDEN (default), ALREADY_DELETED
  restore(): void;        // throws NOT_DELETED
}
```

### Domain Errors

```typescript
DomainError('INVALID_BRANCH_NAME')       // name.trim().length < 2
DomainError('CANNOT_DEACTIVATE_DEFAULT_BRANCH')
DomainError('DELETE_FORBIDDEN')          // روی default branch
DomainError('ALREADY_DELETED')
DomainError('NOT_DELETED')
```

### Invariants (ADR-009)

1. isDefault branch → deactivate/softDelete → forbidden
2. دقیقاً یک `isDefault=true` per tenant — enforced در use case + partial unique index (TASK-019)
3. `softDelete` → `_isActive = false` (برای consistency)
4. `restore` → `_isActive = true`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/domain/src/core/branch/branch.entity.ts` |
| Create/Update | `packages/domain/src/core/branch/branch.entity.spec.ts` |

---

## مراحل پیاده‌سازی

1. پیاده‌سازی کلاس `Branch` با constructor
2. اضافه کردن `static create()` با name validation
3. اضافه کردن `static createDefault()` — name='شعبه اصلی'
4. اضافه کردن `static reconstitute()` بدون validation
5. پیاده‌سازی `rename()`, `deactivate()`, `softDelete()`, `restore()`
6. نوشتن spec

---

## Edge Cases & Errors

| سناریو | Domain Error | رفتار |
|--------|-------------|--------|
| deactivate default branch | `CANNOT_DEACTIVATE_DEFAULT_BRANCH` | throws |
| softDelete default branch | `DELETE_FORBIDDEN` | throws |
| softDelete twice | `ALREADY_DELETED` | throws |
| restore when not deleted | `NOT_DELETED` | throws |
| rename با name < 2 chars | `INVALID_BRANCH_NAME` | throws |
| softDelete → isActive | — | `_isActive = false` |
| restore → isActive | — | `_isActive = true` |

---

## تست

```typescript
// packages/domain/src/core/branch/branch.entity.spec.ts
- createDefault() → isDefault=true, name='شعبه اصلی'
- deactivate default branch → CANNOT_DEACTIVATE_DEFAULT_BRANCH
- softDelete default branch → DELETE_FORBIDDEN
- softDelete non-default → isDeleted=true, isActive=false
- restore → isDeleted=false, isActive=true
- rename با name کوتاه → INVALID_BRANCH_NAME
- softDelete twice → ALREADY_DELETED
- restore when active → NOT_DELETED
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY §5 — soft delete branch، sales باقی می‌مانند
- [ ] ADR-009 — default branch protected از soft delete و deactivate
- [ ] ADR-015 — branch domain invariants برای staff assignment
- [ ] DEVELOPMENT_RULES §1.2 — Domain layer خالص

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §Branch
- `docs/08-decisions/adr-log.md` — ADR-009, ADR-015
- `docs/09-development/SOFT-DELETE-POLICY.md` §5

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Interface کامل، reconstitute، domain errors، acceptance criteria، files ✓ |
| Policy | 25/25 | ADR-009، soft delete، domain purity ✓ |
| Executability | 25/25 | Steps، test cases، edge cases ✓ |
| Alignment | 15/15 | Sync با TASK-019 schema، TASK-057 register ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
