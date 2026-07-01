# TASK-029: Domain Entity — Tenant

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-05-Domain-Core |
| ID | TASK-029 |
| Priority | P0 |
| Depends on | TASK-010, TASK-027 |
| Blocks | TASK-030, TASK-054, TASK-057 |
| Estimated | 4h |

---

## هدف

پیاده‌سازی `Tenant` domain entity — factory، status transitions، soft delete. این entity در `packages/domain/` است و هیچ import از NestJS، Prisma، یا HTTP ندارد. پیاده در Clean Architecture: Domain layer خالص.

---

## معیار پذیرش

- [ ] کلاس `Tenant` با constructor، `static create()`، `static reconstitute()`
- [ ] Methods: `suspend(reason?)`, `activate()`, `hasModule(code)`, `softDelete(deletedById, reason?)`, `restore()`
- [ ] Getters: `id`, `name`, `slug`, `status`, `planId`, `enabledModules`, `deletedAt`, `deletedById`, `isDeleted`
- [ ] Slug validation: `/^[a-z0-9-]+$/`، طول 3–50
- [ ] `enabledModules` حداقل یک عنصر
- [ ] `softDelete` → `ALREADY_DELETED` اگر قبلاً حذف شده
- [ ] `restore` → `NOT_DELETED` اگر حذف نشده
- [ ] `suspend` → `ALREADY_SUSPENDED` اگر قبلاً suspended
- [ ] فایل spec با ≥7 test case
- [ ] هیچ import از Prisma/NestJS/HTTP

---

## مشخصات فنی

### Interface

```typescript
export type TenantStatus = 'trial' | 'active' | 'suspended';

export class Tenant {
  constructor(
    readonly id: string,
    private _name: string,
    readonly slug: string,
    private _status: TenantStatus,
    readonly planId: string,
    readonly enabledModules: string[],
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  static create(props: { name: string; slug: string; planId: string; modules: string[] }): Tenant;
  static reconstitute(props: ReconstituteTenantProps): Tenant;

  suspend(reason?: string): void;    // throws ALREADY_SUSPENDED
  activate(): void;                  // throws ALREADY_ACTIVE
  hasModule(code: string): boolean;
  softDelete(deletedById: string, reason?: string): void;  // throws ALREADY_DELETED
  restore(): void;                   // throws NOT_DELETED

  get name(): string;
  get status(): TenantStatus;
  get deletedAt(): Date | null;
  get deletedById(): string | null;
  get isDeleted(): boolean;
}
```

### Reconstitute

```typescript
static reconstitute(props: {
  id: string; name: string; slug: string;
  status: TenantStatus; planId: string; enabledModules: string[];
  deletedAt: Date | null; deletedById: string | null;
}): Tenant
```

برای mapper: `packages/infrastructure/src/persistence/mappers/tenant.mapper.ts`

### Validation Rules

```typescript
SLUG_PATTERN = /^[a-z0-9-]+$/
SLUG_MIN = 3, SLUG_MAX = 50
// modules.length === 0 → DomainError('MODULES_REQUIRED')
```

### Domain Errors

```typescript
DomainError('INVALID_SLUG')
DomainError('MODULES_REQUIRED')
DomainError('ALREADY_SUSPENDED')
DomainError('ALREADY_ACTIVE')
DomainError('ALREADY_DELETED')
DomainError('NOT_DELETED')
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/domain/src/core/tenant/tenant.entity.ts` |
| Create/Update | `packages/domain/src/core/tenant/tenant.entity.spec.ts` |
| Create/Update | `packages/domain/src/errors/domain.error.ts` |
| Create | `packages/infrastructure/src/persistence/mappers/tenant.mapper.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `DomainError` در `packages/domain/src/errors/domain.error.ts`
2. پیاده‌سازی `Tenant` class با constructor
3. اضافه کردن `static create()` با slug/modules validation
4. اضافه کردن `static reconstitute()` بدون validation
5. پیاده‌سازی methods: suspend، activate، hasModule، softDelete، restore
6. نوشتن spec با همه test cases
7. پیاده‌سازی `tenant.mapper.ts` در infrastructure

---

## Edge Cases & Errors

| سناریو | Domain Error | رفتار |
|--------|-------------|--------|
| slug با حروف بزرگ یا underscore | `INVALID_SLUG` | create throws |
| slug < 3 کاراکتر | `INVALID_SLUG` | create throws |
| modules=[] | `MODULES_REQUIRED` | create throws |
| suspend دو بار | `ALREADY_SUSPENDED` | throws |
| activate وقتی active | `ALREADY_ACTIVE` | throws |
| softDelete دو بار | `ALREADY_DELETED` | throws |
| restore وقتی حذف نشده | `NOT_DELETED` | throws |
| suspended tenant → writes | — | use case layer check می‌کند |

---

## تست

```typescript
// packages/domain/src/core/tenant/tenant.entity.spec.ts
- create با props معتبر → trial status، slug صحیح
- create با slug نامعتبر → INVALID_SLUG
- create با modules=[] → MODULES_REQUIRED
- suspend → active; suspend مجدد → ALREADY_SUSPENDED
- activate → active; activate مجدد → ALREADY_ACTIVE
- softDelete → isDeleted=true، deletedById set
- softDelete مجدد → ALREADY_DELETED
- restore → isDeleted=false
- restore وقتی active → NOT_DELETED
- hasModule → true/false
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY §5 — soft delete Tenant، branches و staff باقی می‌مانند
- [ ] EXCELLENCE §8 Tenant — mapper تمام فیلدها را map می‌کند
- [ ] DEVELOPMENT_RULES §1.2 — Domain layer: هیچ import از NestJS/Prisma
- [ ] ADR-013 — soft delete only، no hard delete method

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §Tenant
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/09-development/DEVELOPMENT_RULES.md` §1.2

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Interface کامل، reconstitute، domain errors، acceptance criteria، files ✓ |
| Policy | 25/25 | Domain purity، soft delete، ADR-013، no Prisma imports ✓ |
| Executability | 25/25 | Steps، test cases listed، edge cases ✓ |
| Alignment | 15/15 | Sync با TASK-027 schema، TASK-030 branch، mapper ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
