# TASK-011: Package Skeleton — packages/application

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-011 |
| Priority | P0 |
| Depends on | TASK-010 |
| Blocks | TASK-035, TASK-047, TASK-054 |
| Estimated | 3h |
| Status | ✅ Done |

---

## هدف

Use case layer — orchestrates domain entities با port interfaces. وابستگی فقط به `@hivork/domain`، نه به infrastructure. هر use case یک `execute(input): Promise<output>` دارد. Ports (interfaces) اینجا تعریف می‌شوند؛ implementations در `@hivork/infrastructure`.

---

## معیار پذیرش

- [x] `@hivork/application` فقط به `@hivork/domain` وابسته است (نه infrastructure)
- [x] Port interfaces: `ITenantRepository`، `IStaffRepository`، `ISmsPort`، `IOtpPort`، `IAuditPort`...
- [x] `UseCase<I, O>` interface تعریف شده
- [x] Use cases: `RequestOtpUseCase`، `VerifyOtpUseCase`، `LogoutUseCase` (auth)
- [x] Use cases: `CreateTenantCustomerUseCase` (customers)
- [x] Error mapping: domain errors → application errors
- [x] Vitest configured

---

## مشخصات فنی

### ساختار پوشه

```
packages/application/
├── src/
│   ├── index.ts
│   ├── core/
│   │   └── use-case.ts          # UseCase<I, O> interface
│   ├── ports/                   # interfaces only — implemented in infrastructure
│   │   ├── index.ts
│   │   ├── tenant.repository.port.ts
│   │   ├── staff.repository.port.ts
│   │   ├── auth.port.ts
│   │   ├── otp.port.ts
│   │   ├── sms.port.ts
│   │   ├── audit.port.ts
│   │   ├── outbox.port.ts
│   │   └── ...
│   ├── errors/
│   │   ├── application.error.ts
│   │   └── map-domain-error.ts
│   ├── auth/                    # auth use cases
│   ├── customers/               # customer use cases
│   ├── rbac/                    # permission use cases
│   └── settings/                # settings use cases
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### `UseCase<I, O>` interface

```typescript
export interface UseCase<I, O> {
  execute(input: I): Promise<O>;
}
```

### Port example

```typescript
export interface ITenantRepository {
  findById(id: string): Promise<TenantEntity | null>;
  findBySlug(slug: string): Promise<TenantEntity | null>;
  save(tenant: TenantEntity): Promise<void>;
  // soft delete: never deleteById
}
```

### Error mapping

```typescript
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message?: string,
  ) {
    super(message ?? code);
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/core/use-case.ts` |
| Create | `packages/application/src/ports/` (همه ports) |
| Create | `packages/application/src/errors/**` |
| Create | `packages/application/src/auth/**` (use cases) |
| Create | `packages/application/src/customers/**` |
| Create | `packages/application/package.json` |
| Create | `packages/application/tsconfig.json` |
| Create | `packages/application/vitest.config.ts` |

---

## مراحل پیاده‌سازی

1. `UseCase<I, O>` interface تعریف کن
2. Port interfaces را برای هر infrastructure service تعریف کن
3. `ApplicationError` و error mapping utility
4. Auth use cases: `RequestOtpUseCase`، `VerifyOtpUseCase`، `LogoutUseCase`
5. Customer use cases: `CreateTenantCustomerUseCase`
6. Unit tests برای هر use case (mock ports)
7. Build و test را verify کن

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Infrastructure import در use case | TypeScript error (dep نیست) |
| Port not implemented | Runtime error — NestJS DI fail |
| Use case با null input | Validation در port یا domain entity |
| Concurrent execute | هر use case thread-safe باشد (stateless) |
| Domain error از entity | `mapDomainError()` → `ApplicationError` |

---

## تست

```typescript
// Example unit test with mocked port
const mockOtpPort: IOtpPort = { store: vi.fn(), verify: vi.fn() };
const useCase = new RequestOtpUseCase(mockOtpPort, mockSmsPort);
await useCase.execute({ phone: '09123456789' });
expect(mockOtpPort.store).toHaveBeenCalledOnce();
```

```bash
pnpm --filter @hivork/application test
```

---

## ممنوعیت‌ها

- Import `@hivork/infrastructure` در use cases (inject ports via DI)
- NestJS decorators در use case classes (pure TypeScript)
- Prisma types مستقیم در use case

---

## Policy Alignment

- [x] ADR-002 — Application layer orchestrates domain via ports
- [x] DEVELOPMENT_RULES.md §3 — "Business logic فقط در packages/application"
- [x] SOFT-DELETE-POLICY — Port interfaces شامل `softDelete` / `restore` methods
- [x] PHASE_EPIC_TASK_AUTHORING_RULES §8 — "Soft delete + restore use cases" — task جدا

---

## مراجع

- `docs/02-architecture/overview.md`
- `docs/09-development/SOFT-DELETE-POLICY.md`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، ports، use cases، error mapping |
| Policy (25) | 25/25 | ADR-002، soft delete در ports |
| Executability (25) | 24/25 | Edge cases، tests — mock pattern |
| Alignment (15) | 15/15 | Sync با overview.md |
| **جمع** | **99/100** | ✅ Ready |
