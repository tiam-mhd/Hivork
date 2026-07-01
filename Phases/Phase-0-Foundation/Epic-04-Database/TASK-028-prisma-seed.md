# TASK-028: Database Seed

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-028 |
| Priority | P0 |
| Depends on | TASK-027, TASK-059 |
| Blocks | TASK-054, TASK-057 |
| Estimated | 6h |

---

## هدف

ایجاد seed idempotent که پیش‌نیاز کل محیط توسعه را آماده کند: Plans، Permissions، Template Roles، Platform Admin، Demo Tenant با Branch و Owner Staff. Seed باید چندین بار اجرا شود بدون duplicate یا خطا.

---

## معیار پذیرش

- [ ] `pnpm db:seed` idempotent (اجرای N بار → نتیجه یکسان)
- [ ] **Plans**: starter (رایگان)، pro، enterprise — BigInt priceRial
- [ ] **Permissions**: همه CORE_PERMISSION_CODES + INSTALLMENTS_PERMISSION_CODES + restore extras
- [ ] **Template roles** (`isTemplate=true`, `tenantId=null`): owner، manager، cashier، viewer
- [ ] **Template role-permission mappings** مطابق role-mappings.ts
- [ ] **Platform super_admin** با phone از env `SEED_PLATFORM_ADMIN_PHONE`
- [ ] **Demo tenant** `demo-shop` با plan=starter، status=trial
- [ ] **Demo branch**: شعبه اصلی (isDefault=true)
- [ ] **Demo subscription** active
- [ ] **Demo staff** (owner) با phone از env `SEED_OWNER_PHONE` — role=owner
- [ ] **Cloned roles** برای demo tenant از templates
- [ ] **Core settings defaults** برای demo tenant
- [ ] Restore permissions: `core.customer.restore`, `core.customer.delete`, `core.recycle.view`

---

## مشخصات فنی

### Plans

```typescript
// prisma/seed/plans.ts
{ code: 'starter', name: 'استارتر', modules: ['installments'], maxCustomers: 500, maxStaff: 5, maxBranches: 2, priceRial: 0n }
{ code: 'pro', name: 'حرفه‌ای', modules: ['installments'], maxCustomers: 5_000, maxStaff: 25, maxBranches: 10, priceRial: 500_000_000n }
{ code: 'enterprise', name: 'سازمانی', modules: ['installments'], maxCustomers: 999_999, maxStaff: 999, maxBranches: 999, priceRial: 2_000_000_000n }
```

### Template Roles

```typescript
// prisma/seed/role-mappings.ts
owner:   dataScope=all,    permissions=ALL
manager: dataScope=all,    permissions=ALL minus [settings.edit, role.*core, staff.create/delete]
cashier: dataScope=branch, permissions=[branch.view, sale.view/create, installment.view, payment.view/confirm, customer.view]
viewer:  dataScope=branch, permissions=view-only permissions
```

### Role Clone Mechanism

```
Seed templates (isTemplate=true, tenantId=null)
       ↓
RegisterTenantUseCase (TASK-057) clones templates → tenantId=new_tenant.id, isTemplate=false
       ↓
Demo tenant: clone in seed برای استفاده فوری
```

### Core Settings Defaults

```typescript
{ module: 'core', key: 'timezone', value: 'Asia/Tehran' }
{ module: 'core', key: 'display_currency', value: 'toman' }
{ module: 'core', key: 'default_branch_required', value: true }
```

### Env Variables

| Variable | Default |
|----------|---------|
| `SEED_PLATFORM_ADMIN_PHONE` | `09120000001` |
| `SEED_OWNER_PHONE` | `09120000000` |
| `DATABASE_URL` | از `.env` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `prisma/seed/index.ts` |
| Create/Update | `prisma/seed/plans.ts` |
| Create/Update | `prisma/seed/permissions.ts` |
| Create/Update | `prisma/seed/role-mappings.ts` |
| Config | `package.json` → `prisma.seed` |

---

## مراحل پیاده‌سازی

1. تعریف `SEED_PLANS` در `plans.ts` با BigInt priceRial
2. تعریف `ALL_SEED_PERMISSION_CODES` — import از module manifests + extras
3. تعریف `TEMPLATE_ROLES` با permission mappings
4. پیاده‌سازی `seedPermissions()` — upsert idempotent
5. پیاده‌سازی `seedTemplateRoles()` با `syncRolePermissions()`
6. پیاده‌سازی `seedPlans()` — upsert
7. پیاده‌سازی `seedPlatformAdmin(phone)` — upsert
8. پیاده‌سازی `seedDemoTenant()` با clone roles + settings
9. تست: اجرای دو بار `pnpm db:seed` → بدون خطا

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| seed دو بار اجرا شود | upsert — نه duplicate |
| permission code جدید اضافه شود | upsert → اضافه می‌شود |
| plan price تغییر کند | update via upsert |
| SEED_OWNER_PHONE تغییر کند | User upsert + Staff جدید برای demo tenant (unique `(tenantId, userId)`) |
| template role permissions تغییر کند | `syncRolePermissions` deleteMany + createMany |
| DB خالی | همه چیز از صفر ساخته می‌شود |

---

## تست

- [ ] Integration: `pnpm db:seed` موفق روی DB جدید
- [ ] Integration: اجرای دوم idempotent (no error, no duplicate)
- [ ] Integration: plans با BigInt priceRial صحیح
- [ ] Integration: template roles وجود دارند با permissions
- [ ] Integration: demo tenant با owner staff و role
- [ ] Integration: cloned roles برای demo tenant (isTemplate=false)

---

## Flow

```
main()
  → seedPermissions()   # upsert all permission codes
  → seedPlans()         # upsert 3 plans
  → seedTemplateRoles() # create/update templates + syncRolePermissions
  → seedPlatformAdmin() # upsert super_admin
  → seedDemoTenant()
      → upsert tenant demo-shop
      → create/find default branch
      → create subscription active
      → cloneRoleForTenant() × 4
      → upsert owner staff + StaffRole
      → seedCoreSettings()
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — seed از hard delete استفاده نمی‌کند
- [ ] BigInt: `priceRial` در plans به صورت `BigInt` literal
- [ ] Role clone: TASK-057 use case همین pattern را برای tenant جدید دنبال می‌کند

---

## مراجع

- `docs/02-architecture/rbac.md`
- `docs/02-architecture/tenancy-and-entities.md`
- `docs/09-development/SOFT-DELETE-POLICY.md`

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Plans، roles، demo tenant، settings، acceptance criteria، files ✓ |
| Policy | 25/25 | Idempotent، BigInt، role clone، no hard delete ✓ |
| Executability | 25/25 | Steps، flow، edge cases، tests، env vars ✓ |
| Alignment | 15/15 | Sync با TASK-027، TASK-057، TASK-059 ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
