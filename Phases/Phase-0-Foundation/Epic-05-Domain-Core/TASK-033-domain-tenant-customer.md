# TASK-033: Domain Entity — TenantCustomer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-05-Domain-Core |
| ID | TASK-033 |
| Priority | P0 |
| Depends on | TASK-032 |
| Blocks | TASK-054, TASK-056, TASK-058 |
| Estimated | 5h |

---

## هدف

پیاده‌سازی `TenantCustomer` domain entity — رابطه بین Tenant و GlobalCustomer که داده tenant-specific مشتری را نگه می‌دارد. این entity از طریق `static link()` ایجاد می‌شود و soft delete + restore دارد. Customer زیر Branch نیست اما `defaultBranchId` اختیاری دارد (ADR-002).

---

## معیار پذیرش

- [ ] کلاس `TenantCustomer` با `static link()` و `static reconstitute()`
- [ ] Methods: `updateProfile(props)`, `softDelete(deletedById, reason?)`, `restore()`
- [ ] Getters: `id`, `tenantId`, `globalCustomerId`, `localCode`, `notes`, `internalNotes`, `defaultBranchId`, `tags`, `marketingOptIn`, `preferredContactChannel`, `deletedAt`, `deletedById`, `deleteReason`, `isDeleted`
- [ ] `updateProfile()` روی deleted → `CUSTOMER_DELETED`
- [ ] Field validations: `localCode` max 50، `notes`/`internalNotes` max 1000، `tags` max 20 آیتم، tag max 30 chars
- [ ] `softDelete()` دو بار → `ALREADY_DELETED`
- [ ] `restore()` روی not deleted → `NOT_DELETED`
- [ ] `static reconstitute()` بدون validation برای mapper
- [ ] فایل spec با ≥5 test case
- [ ] هیچ import از Prisma/NestJS

---

## مشخصات فنی

### Interface

```typescript
export type PreferredContactChannel = 'telegram' | 'bale' | 'sms' | 'phone';

export type TenantCustomerLinkProps = {
  localCode?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  defaultBranchId?: string | null;
  tags?: string[];
  marketingOptIn?: boolean;
  preferredContactChannel?: PreferredContactChannel | null;
};

export class TenantCustomer {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly globalCustomerId: string,
    private _localCode: string | null,
    private _notes: string | null,
    private _internalNotes: string | null,
    private _defaultBranchId: string | null,
    private _tags: string[],
    private _marketingOptIn: boolean,
    private _preferredContactChannel: PreferredContactChannel | null,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static link(
    tenantId: string,
    globalCustomerId: string,
    props?: TenantCustomerLinkProps,
  ): TenantCustomer;

  static reconstitute(props: ReconstituteTenantCustomerProps): TenantCustomer;

  updateProfile(props: Partial<TenantCustomerLinkProps>): void;  // throws CUSTOMER_DELETED
  softDelete(deletedById: string, reason?: string): void;         // throws ALREADY_DELETED
  restore(): void;                                                 // throws NOT_DELETED
}
```

### Validation Constants

```typescript
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 30;
const MAX_LOCAL_CODE_LENGTH = 50;
const MAX_NOTES_LENGTH = 1000;
```

### Note on Extended Fields

فیلدهای `creditScore`, `overdueCount`, `totalPurchaseRial`, `lastPurchaseAt` در schema (TASK-023) هستند اما در domain entity وجود ندارند — اینها aggregate read model / infrastructure responsibility هستند و توسط use case‌های آمار به‌روز می‌شوند.

### Domain Errors

```typescript
DomainError('CUSTOMER_DELETED')     // updateProfile روی deleted
DomainError('FIELD_TOO_LONG')       // localCode/notes بیش از max
DomainError('TOO_MANY_TAGS')        // tags > 20
DomainError('TAG_TOO_LONG')         // tag > 30 chars
DomainError('ALREADY_DELETED')
DomainError('NOT_DELETED')
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/domain/src/core/customer/tenant-customer.entity.ts` |
| Create/Update | `packages/domain/src/core/customer/tenant-customer.entity.spec.ts` |

---

## مراحل پیاده‌سازی

1. پیاده‌سازی کلاس `TenantCustomer` با constructor
2. اضافه کردن `static link()` با field validations
3. اضافه کردن `static reconstitute()` بدون validation
4. پیاده‌سازی `updateProfile()` با partial update pattern
5. پیاده‌سازی `softDelete()` و `restore()`
6. اضافه کردن helper functions: `normalizeOptionalText()`, `normalizeTags()`
7. نوشتن spec

---

## Edge Cases & Errors

| سناریو | Domain Error | رفتار |
|--------|-------------|--------|
| updateProfile روی deleted | `CUSTOMER_DELETED` | throws |
| localCode > 50 chars | `FIELD_TOO_LONG` | link/update throws |
| notes > 1000 chars | `FIELD_TOO_LONG` | throws |
| tags > 20 | `TOO_MANY_TAGS` | throws |
| tag > 30 chars | `TAG_TOO_LONG` | throws |
| softDelete دو بار | `ALREADY_DELETED` | throws |
| restore when active | `NOT_DELETED` | throws |
| duplicate tags | — | normalize: dedup + trim |
| (tenantId, globalCustomerId) تکراری | 409 | در repository |

---

## تست

```typescript
// packages/domain/src/core/customer/tenant-customer.entity.spec.ts
- link() → entity با defaults صحیح
- softDelete + restore cycle (deleteReason cleared)
- updateProfile روی deleted → CUSTOMER_DELETED
- tags > 20 → TOO_MANY_TAGS
- duplicate tags → dedup
- localCode > 50 → FIELD_TOO_LONG
- notes > 1000 → FIELD_TOO_LONG
```

---

## Use Cases

| Use Case | Task |
|----------|------|
| Create/Link | TASK-058 |
| Soft delete / Restore | TASK-056 |

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 TenantCustomer/GlobalCustomer — domain entity منعکس کننده business fields
- [ ] SOFT-DELETE-POLICY §9 — test: softDelete → 404، restore → visible
- [ ] ADR-002 — Customer زیر Branch نیست
- [ ] DEVELOPMENT_RULES §1.2 — Domain layer خالص

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §TenantCustomer
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/08-decisions/adr-log.md` — ADR-002

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Interface، constants، notes، acceptance criteria، files ✓ |
| Policy | 25/25 | ADR-002، soft delete، domain purity ✓ |
| Executability | 25/25 | Steps، test cases، edge cases ✓ |
| Alignment | 15/15 | Sync با TASK-023 schema، TASK-056/058 use cases ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
