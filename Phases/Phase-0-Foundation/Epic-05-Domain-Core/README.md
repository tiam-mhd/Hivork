# Epic-05 — Domain Core

## هدف Epic

پیاده‌سازی domain entities خالص برای core module: Tenant، Branch، Staff، GlobalCustomer، TenantCustomer، و RBAC value objects. تمام entities بدون import از Prisma/NestJS/HTTP هستند (Clean Architecture Domain Layer).

## Tasks

| ID | فایل | عنوان | Priority | Depends | Blocks |
|----|------|--------|----------|---------|--------|
| 029 | TASK-029-domain-tenant.md | Domain Tenant | P0 | 010, 027 | 030, 054, 057 |
| 030 | TASK-030-domain-branch.md | Domain Branch | P0 | 029 | 031, 054, 057 |
| 031 | TASK-031-domain-staff.md | Domain Staff | P0 | 029, 034 | 035, 041, 057 |
| 032 | TASK-032-domain-global-customer.md | Domain GlobalCustomer | P0 | 010, 027, 034a | 033, 035, 058 |
| 033 | TASK-033-domain-tenant-customer.md | Domain TenantCustomer | P0 | 032 | 054, 056, 058 |
| 034 | TASK-034-domain-rbac.md | Domain RBAC VOs | P0 | 010 | 031, 041, 043, 057 |
| 034a | TASK-034a-domain-user.md | Domain User (platform identity) | P0 | 010, 019a | 035, 036, 057, 058 |

## Dependency (داخل Epic)

```
029 (Tenant)
 ├── 030 (Branch) → 031 (Staff)
 └── 034 (RBAC)  → 031 (Staff)

032 (GlobalCustomer) → 033 (TenantCustomer)

034a (User — ADR-017) → 035/036 auth, 057/058 use cases
```

## Policy

- **Domain purity**: هیچ import از NestJS، Prisma، HTTP، Redis
- **Soft delete**: همه entities (به جز RBAC VOs) `softDelete()` + `restore()` دارند
- **Factory**: هر entity `static create()` + `static reconstitute()` دارد
- **Domain errors**: typed `DomainError(code)` — نه string throw
- **Installment** (phase 1): soft delete ندارد — فقط terminal status

## File Locations

```
packages/domain/src/core/
├── user/
│   ├── user.entity.ts
│   └── user.entity.spec.ts
├── tenant/
│   ├── tenant.entity.ts
│   └── tenant.entity.spec.ts
├── branch/
│   ├── branch.entity.ts
│   └── branch.entity.spec.ts
├── staff/
│   ├── staff.entity.ts
│   └── staff.entity.spec.ts
├── customer/
│   ├── global-customer.entity.ts
│   ├── global-customer.entity.spec.ts
│   ├── tenant-customer.entity.ts
│   └── tenant-customer.entity.spec.ts
├── rbac/
│   ├── permission.vo.ts
│   ├── permission.vo.spec.ts
│   ├── role.vo.ts
│   ├── role.vo.spec.ts
│   ├── data-scope.vo.ts
│   ├── effective-permissions.service.ts
│   ├── effective-permissions.service.spec.ts
│   └── soft-deletable.vo.ts
└── shared/
    ├── phone.ts
    └── phone.spec.ts
```
