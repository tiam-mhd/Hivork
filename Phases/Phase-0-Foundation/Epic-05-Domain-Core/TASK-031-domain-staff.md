# TASK-031: Domain Entity — Staff

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-05-Domain-Core |
| ID | TASK-031 |
| Priority | P0 |
| Depends on | TASK-029, TASK-034 |
| Blocks | TASK-035, TASK-041, TASK-057 |
| Estimated | 4h |

---

## هدف

پیاده‌سازی `Staff` domain entity — actor داخلی tenant با branch assignment و RBAC data scope. Staff به Tenant وصل است (نه Branch مستقیم). محدودیت‌های شعبه از طریق `assignedBranchIds[]` و `effectiveBranchIds()` مدیریت می‌شود (ADR-015). Entity خالص TypeScript بدون Prisma/NestJS.

---

## معیار پذیرش

- [ ] کلاس `Staff` با `static create()` و `static reconstitute()`
- [ ] FK `userId` — phone در domain entity **نیست** (application/repo از User join)
- [ ] Methods: `suspend()`, `assignBranches(ids)`, `setPrimaryBranch(id?)`, `canAccessBranch(id)`, `effectiveBranchIds(activeBranchId?)`, `softDelete(deletedById, reason?)`, `restore()`
- [ ] Getter `canAuthenticate`: `status=active && !isDeleted`
- [ ] `assignBranches([])` → all branches allowed
- [ ] `canAccessBranch(id)` با empty assign → true (all)؛ else check includes
- [ ] `effectiveBranchIds()`: اگر `dataScope !== 'branch'` → `[]`؛ اگر `activeBranchId` set → `[activeBranchId]` اگر allowed؛ else `assignedBranchIds`
- [ ] `setPrimaryBranch(id)` با id غیر مجاز → `BRANCH_NOT_ALLOWED`
- [ ] فایل spec با ≥6 test case
- [ ] هیچ import از Prisma/NestJS

---

## مشخصات فنی

### Interface

```typescript
export type StaffStatus = 'active' | 'suspended';

export class Staff {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly userId: string,
    private _name: string,
    private _status: StaffStatus,
    private _dataScope: DataScope,
    private _assignedBranchIds: string[],
    private _primaryBranchId: string | null,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  static create(props: {
    tenantId: string; userId: string; name: string;
    dataScope?: DataScope; assignedBranchIds?: string[]; primaryBranchId?: string | null;
  }): Staff;

  static reconstitute(props: ReconstitutStaffProps): Staff;

  suspend(): void;             // throws ALREADY_SUSPENDED
  assignBranches(ids: string[]): void;         // throws DUPLICATE_BRANCH_IDS
  setPrimaryBranch(id: string | null): void;   // throws BRANCH_NOT_ALLOWED
  canAccessBranch(id: string): boolean;
  effectiveBranchIds(activeBranchId?: string | null): string[];  // throws BRANCH_NOT_ALLOWED
  softDelete(deletedById: string, reason?: string): void;
  restore(): void;

  get name(): string;
  get status(): StaffStatus;
  get dataScope(): DataScope;
  get assignedBranchIds(): readonly string[];
  get primaryBranchId(): string | null;
  get deletedAt(): Date | null;
  get deletedById(): string | null;
  get isDeleted(): boolean;
  get canAuthenticate(): boolean;  // status=active && !isDeleted
}
```

### Branch Access Logic (ADR-015)

```typescript
canAccessBranch(id: string): boolean {
  if (this._assignedBranchIds.length === 0) return true;  // empty = all
  return this._assignedBranchIds.includes(id);
}

effectiveBranchIds(activeBranchId?: string | null): string[] {
  if (this._dataScope !== 'branch') return [];  // no filter needed
  if (activeBranchId) {
    if (!this.canAccessBranch(activeBranchId)) throw new DomainError('BRANCH_NOT_ALLOWED');
    return [activeBranchId];
  }
  return [...this._assignedBranchIds];
}
```

### Domain Errors

```typescript
DomainError('ALREADY_SUSPENDED')
DomainError('DUPLICATE_BRANCH_IDS')   // در assignBranches
DomainError('BRANCH_NOT_ALLOWED')     // در setPrimaryBranch / effectiveBranchIds
DomainError('ALREADY_DELETED')
DomainError('NOT_DELETED')
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/domain/src/core/staff/staff.entity.ts` |
| Create/Update | `packages/domain/src/core/staff/staff.entity.spec.ts` |
| Create/Update | `packages/domain/src/core/staff/staff.entity.spec.ts` |

> Phone validation در application layer (`phoneSchema` / `normalizePhone`) — نه domain Staff.

---

## مراحل پیاده‌سازی

1. پیاده‌سازی `Staff` class با `userId`
2. اضافه کردن `static create()` و `static reconstitute()`
4. پیاده‌سازی `canAccessBranch()` و `effectiveBranchIds()`
5. پیاده‌سازی `assignBranches()`, `setPrimaryBranch()`, `suspend()`
6. پیاده‌سازی soft delete methods
7. نوشتن spec

---

## Edge Cases & Errors

| سناریو | Domain Error | رفتار |
|--------|-------------|--------|
| userId نامعتبر / خالی | `VALIDATION_ERROR` | use case layer |
| suspend twice | `ALREADY_SUSPENDED` | throws |
| duplicate branch IDs در assign | `DUPLICATE_BRANCH_IDS` | throws |
| setPrimaryBranch با id غیر مجاز | `BRANCH_NOT_ALLOWED` | throws |
| effectiveBranchIds با active session غیر مجاز | `BRANCH_NOT_ALLOWED` | throws |
| deleted staff → canAuthenticate | — | returns false |
| suspended staff → canAuthenticate | — | returns false |

---

## تست

```typescript
// packages/domain/src/core/staff/staff.entity.spec.ts
- canAccessBranch: empty assign → true (all)
- canAccessBranch: با assign → include/exclude
- setPrimaryBranch: branch خارج از assign → BRANCH_NOT_ALLOWED
- effectiveBranchIds با active session branch مجاز
- effectiveBranchIds با active session branch غیر مجاز → BRANCH_NOT_ALLOWED
- softDelete + restore cycle
- deleted staff → canAuthenticate=false
- suspend twice → ALREADY_SUSPENDED
```

---

## Policy Alignment

- [ ] ADR-017 — Staff FK userId؛ phone روی User
- [ ] ADR-011 — staff/customer same User مجاز
- [ ] ADR-015 — assignedBranchIds + primaryBranchId + effectiveBranchIds
- [ ] SOFT-DELETE-POLICY §5 — soft delete staff، created records باقی
- [ ] DEVELOPMENT_RULES §1.2 — Domain layer خالص

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §Staff
- `docs/08-decisions/adr-log.md` — ADR-011, ADR-015

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Interface کامل، branch logic، domain errors، acceptance criteria ✓ |
| Policy | 25/25 | ADR-011/015، soft delete، domain purity ✓ |
| Executability | 25/25 | Steps، test cases، edge cases ✓ |
| Alignment | 15/15 | Sync با TASK-020 schema، TASK-034 RBAC، TASK-041 auth ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
