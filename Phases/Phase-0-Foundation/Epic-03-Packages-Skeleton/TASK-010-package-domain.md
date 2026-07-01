# TASK-010: Package Skeleton — packages/domain

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-010 |
| Priority | P0 |
| Depends on | TASK-003 |
| Blocks | TASK-011, TASK-029–034 |
| Estimated | 2h |
| Status | ✅ Done |

---

## هدف

Pure TypeScript domain layer — zero framework dependencies. این package business entities، domain errors، و domain events را نگه می‌دارد. هیچ import از `@nestjs/*`، `@prisma/*`، یا هر framework دیگری ندارد.

---

## معیار پذیرش

- [x] `@hivork/domain` buildable (`tsc` → `dist/`)
- [x] هیچ import از `@nestjs/*`, `@prisma/*`, `express`
- [x] Export: `errors/DomainError`، `events/DomainEventBase`، `core/` directory
- [x] `DomainError` base class با `code: string`
- [x] `DomainEventBase` با `aggregateId`، `occurredAt`، `eventType`
- [x] Vitest configured و unit tests pass

---

## مشخصات فنی

### ساختار پوشه

```
packages/domain/
├── src/
│   ├── index.ts
│   ├── errors/
│   │   ├── domain.error.ts
│   │   └── domain.error.spec.ts
│   ├── events/
│   │   ├── domain-event.base.ts
│   │   └── domain-event.base.spec.ts
│   └── core/                          # entities added TASK-029+
│       ├── index.ts
│       ├── tenant/
│       ├── staff/
│       ├── branch/
│       ├── customer/
│       ├── rbac/
│       └── shared/
├── package.json                       # name: @hivork/domain
├── tsconfig.json
└── vitest.config.ts
```

### `DomainError`

```typescript
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}
```

### `DomainEventBase`

```typescript
export abstract class DomainEventBase {
  readonly occurredAt: Date;
  abstract readonly eventType: string;

  constructor(public readonly aggregateId: string) {
    this.occurredAt = new Date();
  }
}
```

### `package.json`

```json
{
  "name": "@hivork/domain",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/src/index.ts` |
| Create | `packages/domain/src/errors/domain.error.ts` |
| Create | `packages/domain/src/errors/domain.error.spec.ts` |
| Create | `packages/domain/src/events/domain-event.base.ts` |
| Create | `packages/domain/src/events/domain-event.base.spec.ts` |
| Create | `packages/domain/package.json` |
| Create | `packages/domain/tsconfig.json` |
| Create | `packages/domain/vitest.config.ts` |

---

## مراحل پیاده‌سازی

1. `package.json` با name `@hivork/domain` و zero runtime deps
2. `tsconfig.json` که از `@hivork/config/tsconfig.base.json` extends کند
3. `DomainError` و `DomainEventBase` base classes
4. Unit tests برای هر دو base class
5. `pnpm --filter @hivork/domain build` و `test` را verify کن
6. `src/core/` پوشه با sub-folders (entities در TASK-029+)

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Import از `@nestjs/*` | TypeScript compile fail (dependency نیست) |
| `DomainError` با `code` خالی | `message` همان `code` می‌شود |
| Entity در `core/` که import می‌کند از infrastructure | ممنوع — PR reject |
| Circular dependency | `tsc` error — از abstract base class استفاده کن |

---

## تست

```bash
pnpm --filter @hivork/domain build
pnpm --filter @hivork/domain test
```

### Unit tests (اجباری):

```typescript
// domain.error.spec.ts
it('should set code and message', () => {
  const err = new DomainError('TENANT_NOT_FOUND');
  expect(err.code).toBe('TENANT_NOT_FOUND');
  expect(err.message).toBe('TENANT_NOT_FOUND');
});

it('should support custom message', () => {
  const err = new DomainError('E001', 'Custom message');
  expect(err.message).toBe('Custom message');
});
```

---

## ممنوعیت‌ها

- NestJS decorators در domain
- Prisma types در domain
- Any framework dependency (pure TypeScript only)

---

## Policy Alignment

- [x] ADR-002 — Clean Architecture: domain = innermost layer
- [x] DEVELOPMENT_RULES.md §3 — "Business logic فقط در packages/domain"
- [x] `.cursor/rules/04-domain-data.mdc` — No framework imports
- [x] SOFT-DELETE-POLICY — Domain entities دارای soft-delete methods هستند (TASK-029+)

---

## مراجع

- `docs/02-architecture/overview.md`
- `.cursor/rules/04-domain-data.mdc`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، structure، code patterns |
| Policy (25) | 25/25 | ADR-002، zero framework explicit |
| Executability (25) | 25/25 | Edge cases، steps، unit tests |
| Alignment (15) | 15/15 | Sync با overview.md |
| **جمع** | **100/100** | ✅ Ready |
