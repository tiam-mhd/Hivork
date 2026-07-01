# IFP-TASK-033: Extend TenantCustomer Schema

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-01-Customer-Schema-Extended |
| ID | IFP-033 |
| Priority | P0 |
| Depends on | Phase 0 TASK-023, TASK-027 (migration baseline) |
| Blocks | IFP-034, IFP-035, IFP-036, IFP-037, IFP-045, IFP-052 |
| Estimated | 6h |
| UI dependency note | لیست/جزئیات مشتری (IFP-053) به **IFP-019 DataTable** وابسته است — خارج از scope این task |

---

## هدف

گسترش مدل `TenantCustomer` و مدل‌های وابسته برای پوشش §۳ محصول: برچسب‌ها (tags موجود)، **دسته‌بندی**، **امتیاز** (creditScore موجود)، **blacklist**، **آدرس‌های چندگانه**، و **مخاطبین اضطراری**. این task پایه schema Epic-01 است و migration بعدی را unblock می‌کند.

---

## معیار پذیرش

- [ ] Migration جدید بدون breaking change روی داده MVP موجود
- [ ] فیلدهای جدید روی `TenantCustomer`: `categoryId`, `status` (active/archived/blacklisted), `isBlacklisted`, `blacklistReason`, `blacklistedAt`, `blacklistedById`, `archivedAt`, `archivedById`, `assignedStaffId` (optional owner)
- [ ] مدل `CustomerCategory` tenant-scoped: name, slug, color, sortOrder, isDefault
- [ ] مدل `CustomerAddress` tenant-scoped: tenantCustomerId, label (home/work/other), line1, line2, city, province, postalCode, isPrimary, latitude, longitude, metadata + base fields
- [ ] مدل `CustomerEmergencyContact`: tenantCustomerId, name, phone, relation, isPrimary + base fields
- [ ] Indexes: `(tenantId, status)`, `(tenantId, categoryId)`, `(tenantId, isBlacklisted)`, `(tenantCustomerId, isPrimary)` on addresses
- [ ] Unique: `(tenantId, slug)` on CustomerCategory
- [ ] FK `onDelete: Restrict` — بدون Cascade hard delete
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### TenantCustomer — فیلدهای افزوده

| فیلد | نوع | توضیح |
|------|-----|--------|
| categoryId | UUID? FK | دسته‌بندی tenant |
| status | enum | active (default), archived, blacklisted |
| isBlacklisted | boolean | default false — denormalized برای فیلتر سریع |
| blacklistReason | string? | staff-only |
| blacklistedAt / blacklistedById | timestamptz / UUID? | audit blacklist |
| archivedAt / archivedById | timestamptz / UUID? | آرشیو بدون soft delete |
| assignedStaffId | UUID? FK Staff | مسئول/مالک مشتری (transfer در IFP-051) |

فیلدهای موجود MVP (localCode, tags, creditScore, overdueCount, totalPurchaseRial, …) **بدون حذف** باقی بمانند.

### CustomerCategory

| فیلد | توضیح |
|------|--------|
| tenantId | FK Tenant |
| name, slug | نام نمایشی + URL-safe |
| color | hex optional برای UI |
| sortOrder | int default 0 |
| isDefault | یک default per tenant (application enforce) |
| + base fields | soft delete |

### CustomerAddress

| فیلد | توضیح |
|------|--------|
| tenantId, tenantCustomerId | FK |
| label | home, work, billing, other |
| line1, line2, city, province, postalCode | متن |
| isPrimary | boolean — max one primary per customer (use case) |
| latitude, longitude | decimal optional — IFP-045 UI |
| + base fields | soft delete |

### CustomerEmergencyContact

| فیلد | توضیح |
|------|--------|
| tenantId, tenantCustomerId | FK |
| name | required |
| phone | normalize 09xxxxxxxxx — **نه** User FK |
| relation | parent, spouse, sibling, other |
| isPrimary | boolean |
| + base fields | soft delete |

### Domain entity updates (TASK-033 domain sync)

- `TenantCustomer.archive()` / `unarchive()` — set archivedAt
- `TenantCustomer.blacklist(reason)` / `removeBlacklist()` — sync status + isBlacklisted
- Validation: archived customer not in default list queries

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `prisma/migrations/{timestamp}_customer_enterprise_schema/` |
| Update | `packages/domain/src/core/customer/tenant-customer.entity.ts` |
| Create | `packages/domain/src/core/customer/customer-category.entity.ts` |
| Create | `packages/domain/src/core/customer/customer-address.entity.ts` |
| Create | `packages/domain/src/core/customer/customer-emergency-contact.entity.ts` |
| Update | `packages/infrastructure/persistence/repositories/` — ports در tasks بعد |

---

## مراحل پیاده‌سازی

1. تعریف enum `TenantCustomerStatus` در schema
2. افزودن فیلدهای TenantCustomer + relations
3. ایجاد CustomerCategory, CustomerAddress, CustomerEmergencyContact با base fields کامل
4. Indexes و unique constraints
5. Domain entities + unit tests برای archive/blacklist transitions
6. `prisma migrate dev` + validate
7. Seed: default category «عمومی» per tenant (optional در migration task یا IFP-036)

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| categoryId متعلق tenant دیگر | 422 | validation در use case |
| دو address isPrimary=true | 422 | فقط یک primary |
| blacklist بدون reason | 422 | reason required when isBlacklisted |
| soft delete address primary | — | promote another یا require new primary |
| archived + active sale create | 409 | domain block در IFP-052 |
| assignedStaffId staff دیگر tenant | 422 | FK + validation |

---

## تست

- [ ] Unit: archive/unarchive/blacklist domain methods
- [ ] Unit: primary address uniqueness rule
- [ ] Integration: migration apply روی DB خالی و DB با seed MVP
- [ ] Integration: cross-tenant categoryId on customer → reject

---

## UX (اگر UI دارد)

- [ ] N/A — schema only؛ UI در IFP-053

---

## Flow (اگر flow دارد)

N/A — schema task

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.1 — base fields همه مدل‌ها
- [ ] EXCELLENCE-STANDARDS §8 — TenantCustomer fields extended
- [ ] SOFT-DELETE-POLICY — soft delete only؛ archive جدا
- [ ] ADR-002 — Customer زیر Branch نیست
- [ ] ADR-013 — Restrict on FK
- [ ] ADR-015 — assignedStaffId same tenant
- [ ] ADR-017 — phone primary روی User only

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §TenantCustomer
- `Phases/Phase-0-Foundation/Epic-04-Database/TASK-023-prisma-tenant-customer.md`
- `docs/01-product/installment-module-features.md` §۳
- `docs/08-decisions/adr-log.md` — ADR-002, ADR-013, ADR-015

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ID, Depends, Blocks, IFP-019 note |
| Completeness | 25 | 25 | All entities, fields, indexes |
| Policy | 25 | 25 | Base fields, soft delete, ADRs |
| Executability | 25 | 24 | Steps + edge cases + tests |
| Alignment | 15 | 15 | MVP TASK-023 sync |
| **جمع** | **100** | **99** | ≥95 ✓ |
