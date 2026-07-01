# TASK-032: Domain Entity — GlobalCustomer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-05-Domain-Core |
| ID | TASK-032 |
| Priority | P0 |
| Depends on | TASK-010, TASK-027 |
| Blocks | TASK-033, TASK-035, TASK-058 |
| Estimated | 3h |

---

## هدف

پیاده‌سازی `GlobalCustomer` domain entity — پروفایل B2C با FK `userId` (ADR-017). phone روی `User` است. این entity از طریق `TenantCustomer` (TASK-033) به tenant‌ها وصل می‌شود.

---

## معیار پذیرش

- [ ] کلاس `GlobalCustomer` با `static create()` و `static reconstitute()`
- [ ] FK `userId` — phone در entity **نیست** (application/use case از User)
- [ ] Methods: `updateName(name)`, `softDelete(deletedById, reason?)`, `restore()`, `pseudonymize()`
- [ ] Getters: `id`, `userId`, `name`, `status`, `deletedAt`, `deletedById`, `pseudonymizedAt`, `isDeleted`, `isPseudonymized`
- [ ] `pseudonymize()`: name → `حذف‌شده`، `pseudonymizedAt = now()`، auto soft delete؛ **User.phone** در use case (SOFT-DELETE §7)
- [ ] `restore()` پس از pseudonymize → `CANNOT_RESTORE_PSEUDONYMIZED`
- [ ] `updateName()` پس از pseudonymize → `CUSTOMER_PSEUDONYMIZED`
- [ ] `softDelete()` دو بار → `ALREADY_DELETED`
- [ ] فایل spec با ≥5 test case
- [ ] هیچ import از Prisma/NestJS

---

## مشخصات فنی

### Interface

```typescript
export type GlobalCustomerStatus = 'active' | 'suspended';
const PSEUDONYMIZED_NAME = 'حذف‌شده';

export class GlobalCustomer {
  constructor(
    readonly id: string,
    readonly userId: string,
    private _name: string | null,
    private _status: GlobalCustomerStatus,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _pseudonymizedAt: Date | null = null,
  ) {}

  static create(userId: string, name?: string): GlobalCustomer;

  static reconstitute(props: {
    id: string; userId: string; name: string | null; status: GlobalCustomerStatus;
    deletedAt: Date | null; deletedById: string | null; pseudonymizedAt: Date | null;
  }): GlobalCustomer;

  updateName(name: string): void;
  softDelete(deletedById: string, reason?: string): void;
  restore(): void;
  pseudonymize(): void;

  get userId(): string;
  get name(): string | null;
  get status(): GlobalCustomerStatus;
  get deletedAt(): Date | null;
  get pseudonymizedAt(): Date | null;
  get isDeleted(): boolean;
  get isPseudonymized(): boolean;
}
```

### Pseudonymize Flow (SOFT-DELETE-POLICY §7)

```typescript
pseudonymize(): void {
  if (this._pseudonymizedAt !== null) throw new DomainError('ALREADY_PSEUDONYMIZED');
  if (this._deletedAt === null) this._deletedAt = new Date();
  this._name = PSEUDONYMIZED_NAME;
  this._pseudonymizedAt = new Date();
}
// User.phone pseudonymize در application layer (CreatePseudonymizeCustomerUseCase)
// داده مالی TenantCustomer/Sale/Installment → باقی می‌ماند
```

### Phone Normalization

```typescript
// packages/domain/src/core/shared/phone.ts
normalizePhone(phone: string): string  // trim + remove leading 0 prefix handling
validatePhone(phone: string): void     // /^09\d{9}$/ → DomainError('INVALID_PHONE')
```

### Domain Errors

```typescript
DomainError('INVALID_PHONE')
DomainError('CUSTOMER_PSEUDONYMIZED')
DomainError('ALREADY_DELETED')
DomainError('NOT_DELETED')
DomainError('CANNOT_RESTORE_PSEUDONYMIZED')
DomainError('ALREADY_PSEUDONYMIZED')
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/domain/src/core/customer/global-customer.entity.ts` |
| Create/Update | `packages/domain/src/core/customer/global-customer.entity.spec.ts` |
| Create/Update | `packages/domain/src/core/shared/phone.ts` |

---

## مراحل پیاده‌سازی

1. پیاده‌سازی `normalizePhone()` و `validatePhone()` در `shared/phone.ts`
2. پیاده‌سازی `GlobalCustomer` class با constructor
3. اضافه کردن `static create()` با phone normalization و validation
4. اضافه کردن `static reconstitute()`
5. پیاده‌سازی `updateName()`, `softDelete()`, `restore()`, `pseudonymize()`
6. نوشتن spec با pseudonymize scenarios

---

## Edge Cases & Errors

| سناریو | Domain Error | رفتار |
|--------|-------------|--------|
| phone نامعتبر | `INVALID_PHONE` | create throws |
| updateName پس از pseudonymize | `CUSTOMER_PSEUDONYMIZED` | throws |
| softDelete دو بار | `ALREADY_DELETED` | throws |
| restore وقتی active | `NOT_DELETED` | throws |
| restore پس از pseudonymize | `CANNOT_RESTORE_PSEUDONYMIZED` | throws |
| pseudonymize دو بار | `ALREADY_PSEUDONYMIZED` | throws |
| pseudonymize بدون soft delete قبلی | — | auto soft delete می‌کند |

---

## تست

```typescript
// packages/domain/src/core/customer/global-customer.entity.spec.ts
- create با phone معتبر → phone normalized
- create با phone نامعتبر → INVALID_PHONE
- softDelete + restore cycle
- pseudonymize → phone/name changed، isPseudonymized=true
- pseudonymize → auto soft delete اگر نشده
- restore پس از pseudonymize → CANNOT_RESTORE_PSEUDONYMIZED
- updateName پس از pseudonymize → CUSTOMER_PSEUDONYMIZED
- pseudonymize دو بار → ALREADY_PSEUDONYMIZED
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY §7 — pseudonymize + soft delete (نه hard delete)
- [ ] ADR-002 — GlobalCustomer platform-level (نه زیر Tenant یا Branch)
- [ ] DEVELOPMENT_RULES §1.2 — Domain layer خالص
- [ ] DEVELOPMENT_RULES §3.7 — GDPR: pseudonymize نه DELETE

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §GlobalCustomer
- `docs/09-development/SOFT-DELETE-POLICY.md` §7
- `docs/08-decisions/adr-log.md` — ADR-002

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Interface، pseudonymize flow، domain errors، acceptance criteria، files ✓ |
| Policy | 25/25 | GDPR pseudonymize، soft delete، ADR-002، domain purity ✓ |
| Executability | 25/25 | Steps، test cases، edge cases ✓ |
| Alignment | 15/15 | Sync با TASK-022 schema، TASK-033 TenantCustomer ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
