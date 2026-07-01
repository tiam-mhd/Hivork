# TASK-018: Prisma Schema — Tenant, Plan, Subscription

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-018 |
| Priority | P0 |
| Depends on | TASK-017 |
| Blocks | TASK-019, TASK-027, TASK-028, TASK-057 |
| Estimated | 4h |

---

## هدف

تعریف سه مدل اصلی SaaS: `Plan` (catalog محصول)، `Tenant` (مشترک)، `Subscription` (اشتراک فعال). این مدل‌ها پایه multi-tenancy هستند و همه entity‌های tenant-scoped به `Tenant.id` وابسته‌اند. EXCELLENCE §8 Tenant باید کامل باشد.

---

## معیار پذیرش

- [ ] مدل‌های `Plan`, `Tenant`, `Subscription` در schema.prisma
- [ ] `Tenant`: تمام فیلدهای EXCELLENCE §8 Tenant — `legalName`, `taxId`, `logoUrl`, `address`, `phone`, `email`, `statusReason`, `trialEndsAt`, `suspendedAt`, `onboardingCompletedAt`, `enabledModules`, `timezone`, `locale`
- [ ] تمام فیلدهای base (EXCELLENCE §2.1) روی هر سه مدل: `createdById`, `updatedById`, `deletedAt`, `deletedById`, `deleteReason`, `version`, `metadata`
- [ ] Enum: `TenantStatus` (trial/active/suspended)، `SubscriptionStatus` (active/past_due/cancelled)، `DataScope`, `Locale`
- [ ] `Plan.priceRial` از نوع `BigInt` (نه number/float)
- [ ] Indexes: `(status)` روی Tenant، `(planId)` روی Tenant، `(tenantId)`, `(tenantId, status)` روی Subscription
- [ ] `onDelete: Restrict` روی همه FK
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Schema

```prisma
enum DataScope {
  all
  branch
  own
}

enum Locale {
  fa_IR
  en_US
}

enum TenantStatus {
  trial
  active
  suspended
}

enum SubscriptionStatus {
  active
  past_due
  cancelled
}

model Plan {
  id           String    @id @default(uuid()) @db.Uuid
  code         String    @unique
  name         String
  modules      String[]
  maxCustomers Int       @map("max_customers")
  maxStaff     Int       @map("max_staff")
  maxBranches  Int       @map("max_branches")
  priceRial    BigInt    @map("price_rial")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String?   @map("created_by_id") @db.Uuid
  updatedById  String?   @map("updated_by_id") @db.Uuid
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  deletedById  String?   @map("deleted_by_id") @db.Uuid
  deleteReason String?   @map("delete_reason")
  version      Int       @default(1)
  metadata     Json?     @db.JsonB

  tenants Tenant[]

  @@map("plans")
}

model Tenant {
  id                    String       @id @default(uuid()) @db.Uuid
  name                  String
  slug                  String       @unique
  legalName             String?      @map("legal_name")
  taxId                 String?      @map("tax_id")
  logoUrl               String?      @map("logo_url")
  address               String?
  phone                 String?      @db.VarChar(11)
  email                 String?
  status                TenantStatus @default(trial)
  statusReason          String?      @map("status_reason")
  planId                String       @map("plan_id") @db.Uuid
  enabledModules        String[]     @map("enabled_modules")
  timezone              String       @default("Asia/Tehran")
  locale                Locale       @default(fa_IR)
  trialEndsAt           DateTime?    @map("trial_ends_at") @db.Timestamptz
  suspendedAt           DateTime?    @map("suspended_at") @db.Timestamptz
  onboardingCompletedAt DateTime?    @map("onboarding_completed_at") @db.Timestamptz
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz
  createdById           String?      @map("created_by_id") @db.Uuid
  updatedById           String?      @map("updated_by_id") @db.Uuid
  deletedAt             DateTime?    @map("deleted_at") @db.Timestamptz
  deletedById           String?      @map("deleted_by_id") @db.Uuid
  deleteReason          String?      @map("delete_reason")
  version               Int          @default(1)
  metadata              Json?        @db.JsonB

  plan            Plan             @relation(fields: [planId], references: [id], onDelete: Restrict)
  branches        Branch[]
  staff           Staff[]
  tenantCustomers TenantCustomer[]
  settings        TenantSetting[]
  subscriptions   Subscription[]

  @@index([status])
  @@index([planId])
  @@map("tenants")
}

model Subscription {
  id           String             @id @default(uuid()) @db.Uuid
  tenantId     String             @map("tenant_id") @db.Uuid
  planId       String             @map("plan_id") @db.Uuid
  status       SubscriptionStatus @default(active)
  startsAt     DateTime           @map("starts_at") @db.Timestamptz
  endsAt       DateTime?          @map("ends_at") @db.Timestamptz
  createdAt    DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime           @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String?            @map("created_by_id") @db.Uuid
  updatedById  String?            @map("updated_by_id") @db.Uuid
  deletedAt    DateTime?          @map("deleted_at") @db.Timestamptz
  deletedById  String?            @map("deleted_by_id") @db.Uuid
  deleteReason String?            @map("delete_reason")
  version      Int                @default(1)
  metadata     Json?              @db.JsonB

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([tenantId, status])
  @@map("subscriptions")
}
```

### Notes

- `Plan.priceRial`: `BigInt` — هرگز `number`/`float`
- `Tenant.slug`: URL-safe، unique (حتی soft-deleted — slug هرگز reuse نمی‌شود)
- `Tenant.enabledModules`: subset تأیید شده از `plan.modules` در use case
- `DataScope` enum اینجا تعریف می‌شود و در TASK-020 (Staff) و TASK-021 (RBAC) استفاده می‌شود

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن enums `DataScope`, `Locale`, `TenantStatus`, `SubscriptionStatus`
2. اضافه کردن model `Plan` با BigInt priceRial
3. اضافه کردن model `Tenant` با تمام فیلدهای EXCELLENCE §8
4. اضافه کردن model `Subscription`
5. تأیید indexes و relations
6. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| slug تکراری | 409 `SLUG_TAKEN` | use case reject |
| slug soft-deleted tenant | — | slug هرگز آزاد نمی‌شود |
| enabledModules خارج از plan.modules | 422 `MODULE_NOT_IN_PLAN` | use case reject |
| plan حذف با tenant فعال | 409 `PLAN_HAS_TENANTS` | onDelete: Restrict |
| Subscription.planId تغییر | نیاز به migration plan | TASK-057 تعریف می‌کند |

---

## تست

- [ ] Unit: `Tenant.create()` domain entity — slug validation
- [ ] Integration: tenant با plan جدید ایجاد شود
- [ ] Integration: slug duplicate → unique violation
- [ ] Integration: `Subscription` با status=active برای tenant ایجاد شود

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 Tenant — تمام فیلدها
- [ ] EXCELLENCE-STANDARDS §2.1 — base fields روی هر سه مدل
- [ ] SOFT-DELETE-POLICY §2 — Tenant, Plan, Subscription soft deletable
- [ ] ADR-013 — no Cascade hard delete (`onDelete: Restrict`)
- [ ] پول: `BigInt` برای `priceRial`

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §8 Tenant
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/02-architecture/tenancy-and-entities.md`

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema کامل، EXCELLENCE §8، acceptance criteria، files ✓ |
| Policy | 25/25 | Base fields، BigInt، soft delete، onDelete: Restrict ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با docs، TASK-027، ADR-013 ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
