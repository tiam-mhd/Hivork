# TASK-012: Package Skeleton — packages/infrastructure

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-012 |
| Priority | P0 |
| Depends on | TASK-010, TASK-017 |
| Blocks | TASK-035, TASK-041, TASK-047 |
| Estimated | 4h |
| Status | ✅ Done |

---

## هدف

Implementations برای port interfaces: Prisma repositories، Redis service، SMS adapter stub، outbox publisher. `PrismaService` با soft-delete extension — `prisma.*.delete()` هرگز call نمی‌شود.

---

## معیار پذیرش

- [x] `@hivork/infrastructure` implements application ports
- [x] `PrismaService` wrapper با NestJS lifecycle hooks
- [x] Prisma soft-delete extension: همه queries `deletedAt: null` filter اضافه می‌کنند
- [x] `RedisService` wrapper (ioredis)
- [x] Repository implementations در `persistence/` — همه `tenantId` filter اجباری
- [x] SMS adapter: console (dev) + stub برای kavenegar
- [x] Outbox publisher stub
- [x] NestJS `InfrastructureModule` که همه providers را export می‌کند

---

## مشخصات فنی

### ساختار پوشه

```
packages/infrastructure/
├── src/
│   ├── index.ts
│   ├── prisma/
│   │   ├── prisma.service.ts         # PrismaClient wrapper
│   │   ├── prisma.module.ts          # NestJS module
│   │   └── prisma-soft-delete.ts     # Prisma extension (excluded from CI guard)
│   ├── redis/
│   │   ├── redis.service.ts          # ioredis wrapper
│   │   └── redis.module.ts
│   ├── persistence/
│   │   ├── tenant.repository.ts      # implements ITenantRepository
│   │   ├── staff.repository.ts       # implements IStaffRepository
│   │   ├── tenant-customer.repository.ts
│   │   └── ...
│   ├── sms/
│   │   ├── console-sms.adapter.ts    # dev: log only
│   │   └── kavenegar-sms.adapter.ts  # prod: stub
│   └── outbox/
│       └── outbox.publisher.ts
├── package.json
└── tsconfig.json
```

### Prisma soft-delete extension

```typescript
// prisma-soft-delete.ts — این فایل از CI hard-delete guard مستثناست
export const softDeleteExtension = Prisma.defineExtension({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        // Note: findUnique doesn't support arbitrary where
        return query(args);
      },
    },
  },
});
```

### `PrismaService`

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // Extend with soft delete
    return this.$extends(softDeleteExtension) as unknown as PrismaService;
  }
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

### Repository pattern (tenant filter mandatory)

```typescript
@Injectable()
export class TenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<TenantEntity | null> {
    const row = await this.prisma.tenant.findFirst({
      where: { id, tenantId },  // ALWAYS tenantId filter
    });
    return row ? TenantMapper.toDomain(row) : null;
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/src/prisma/**` |
| Create | `packages/infrastructure/src/redis/**` |
| Create | `packages/infrastructure/src/persistence/**` |
| Create | `packages/infrastructure/src/sms/**` |
| Create | `packages/infrastructure/src/outbox/**` |
| Create | `packages/infrastructure/package.json` |
| Create | `packages/infrastructure/tsconfig.json` |

---

## مراحل پیاده‌سازی

1. `PrismaService` با lifecycle hooks
2. Soft-delete extension — exclude از CI guard با filename pattern
3. `RedisService` با ioredis
4. Repository stubs برای اصلی‌ترین entities (tenant، staff)
5. ConsoleSmsAdapter برای dev
6. `InfrastructureModule` که همه را export کند
7. Integration test: tenant repo با real DB (Testcontainers یا local Docker)

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `prisma.*.delete()` call | ممنوع — CI hard-delete guard fail |
| `prisma-soft-delete.ts` دارد `.delete(` | CI guard exclude — OK |
| Query بدون `tenantId` | Repository مسئول است — باید fail test شود |
| Prisma connection fail | `onModuleInit` throw — app crash |
| Redis connection fail | ioredis retry strategy — config کن |
| Soft-deleted record در findMany | Extension `deletedAt: null` را اضافه می‌کند |
| findUnique با deletedAt | باید دستی check شود |

---

## تست

```bash
pnpm --filter @hivork/infrastructure build
# Integration test (TASK-034 style):
# → connect to test DB
# → insert tenant
# → soft delete
# → findMany نباید آن را برگرداند
```

---

## ممنوعیت‌ها

- `prisma.*.delete()` — فقط soft delete (updateMany با deletedAt)
- Query tenant-scoped بدون `tenantId` filter
- Business logic در repository (فقط data access)

---

## Policy Alignment

- [x] ADR-013 — Soft delete mandatory — extension در اینجا
- [x] SOFT-DELETE-POLICY.md — "Default queries: `deletedAt: null`"
- [x] DEVELOPMENT_RULES.md §4 — "Repository layer + middleware"
- [x] `.cursor/rules/09-soft-delete-mandatory.mdc`

---

## مراجع

- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/04-technology/tech-stack.md` § Prisma
- `docs/08-decisions/adr-log.md` — ADR-013

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، soft-delete extension، repo pattern |
| Policy (25) | 25/25 | ADR-013، tenantId، soft-delete explicit |
| Executability (25) | 24/25 | Edge cases — integration test pattern |
| Alignment (15) | 15/15 | Sync با SOFT-DELETE-POLICY |
| **جمع** | **99/100** | ✅ Ready |
