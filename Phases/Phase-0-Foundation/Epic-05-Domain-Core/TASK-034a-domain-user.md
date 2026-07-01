# TASK-034a: Domain Entity — User (Platform Identity)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-05-Domain-Core |
| ID | TASK-034a |
| Priority | P0 |
| Depends on | TASK-010, TASK-019a |
| Blocks | TASK-035, TASK-036, TASK-057, TASK-058 |
| Estimated | 2h |

---

## هدف

پیاده‌سازی `User` domain entity — هویت platform با `phone` unique (ADR-017). Staff و GlobalCustomer هر دو FK به User دارند؛ phone validation در domain/shared (`phone.ts`) و روی User entity.

---

## معیار پذیرش

- [ ] کلاس `User` با `static create()` و `static reconstitute()`
- [ ] Phone validation: `/^09\d{9}$/` در `create()` / constructor
- [ ] Methods: `updateName(name?)`, `suspend()`, `pseudonymizePhone()`, `softDelete(deletedById, reason?)`, `restore()`
- [ ] `pseudonymizePhone()`: phone → `deleted_{id}` — آزاد کردن unique constraint
- [ ] Getter `canAuthenticate`: `status=active && !isDeleted && !pseudonymized`
- [ ] فایل spec با ≥4 test case
- [ ] هیچ import از Prisma/NestJS

---

## مشخصات فنی

```typescript
export type UserStatus = 'active' | 'suspended';

export class User {
  constructor(
    readonly id: string,
    private _phone: string,
    private _name: string | null,
    private _status: UserStatus,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  static create(phone: string, name?: string): User;
  static reconstitute(props: { ... }): User;

  pseudonymizePhone(): void;  // phone → deleted_{id}
  suspend(): void;
  // softDelete / restore per SOFT-DELETE-POLICY
}
```

---

## Policy Alignment

- [ ] ADR-017 — canonical platform identity
- [ ] SOFT-DELETE-POLICY §7 — pseudonymize phone on User
- [ ] EXCELLENCE §8 User fields

---

## مراجع

- `docs/08-decisions/ADR-017-user-platform-identity.md`
- `packages/domain/src/core/user/user.entity.ts`
- TASK-019a (Prisma), TASK-031/032 (Staff/GlobalCustomer FK)
