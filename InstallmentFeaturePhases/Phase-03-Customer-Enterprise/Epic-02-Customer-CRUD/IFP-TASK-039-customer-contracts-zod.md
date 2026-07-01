# IFP-TASK-039: Customer Contracts Zod (EXCELLENCE §8)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-02-Customer-CRUD |
| ID | IFP-039 |
| Priority | P0 |
| Depends on | IFP-036, IFP-037, IFP-038 |
| Blocks | IFP-040, IFP-041, IFP-042, IFP-043, IFP-047, IFP-053 |
| Estimated | 5h |

---

## هدف

Schemas Zod در `packages/contracts` برای **100% هم‌ترازی** با APIهای Enterprise مشتری — create, update, list query, detail response, delete/archive/restore, nested DTOs. مرجع EXCELLENCE §8 + ADR-017 phone rules.

---

## معیار پذیرش

- [ ] `CreateTenantCustomerSchema` — all fields IFP-036
- [ ] `UpdateTenantCustomerSchema` — version required, phone forbidden
- [ ] `TenantCustomerDetailSchema` — nested addresses, contacts, phones, category
- [ ] `ListCustomersQuerySchema` — cursor, sort, filters IFP-040
- [ ] `CustomerAddressSchema`, `EmergencyContactSchema`, `ContactPhoneSchema`
- [ ] `ArchiveCustomerSchema`, `DeleteCustomerSchema` (reason optional)
- [ ] `phoneSchema` imported from shared contracts — normalize
- [ ] bigint fields as string in JSON (`totalPurchaseRial`)
- [ ] Persian validation messages (fa) for form errors
- [ ] Exported from `@hivork/contracts` index

---

## مشخصات فنی

### Schema inventory

| Schema | Purpose |
|--------|---------|
| CreateTenantCustomerSchema | POST body |
| UpdateTenantCustomerSchema | PATCH body |
| TenantCustomerDetailSchema | API response |
| TenantCustomerListItemSchema | list row |
| ListCustomersQuerySchema | GET query |
| CustomerAddressInputSchema | nested |
| CustomerDocumentSchema | IFP-043 prep |
| CustomerNoteSchema | IFP-047 prep |
| MergeCustomersSchema | IFP-050 prep |

### List query fields (IFP-040 alignment)

| Query param | Type | Notes |
|-------------|------|-------|
| cursor | string? | opaque |
| limit | number | default 20 max 100 |
| sort | enum | name, createdAt, creditScore, lastPurchaseAt |
| order | asc/desc | |
| q | string? | live search |
| categoryId | uuid? | |
| tags | string[]? | |
| status | active/archived/blacklisted/deleted? | admin only for deleted |
| isBlacklisted | boolean? | |
| branchId | uuid? | filter sales/default branch |
| assignedStaffId | uuid? | |

### Response conventions

- Dates ISO 8601 strings
- Phone masked optional in list (`0912***567`) — setting
- version always present on detail for optimistic lock

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/contracts/src/customers/create-tenant-customer.schema.ts` |
| Create/Update | `packages/contracts/src/customers/update-tenant-customer.schema.ts` |
| Create/Update | `packages/contracts/src/customers/tenant-customer-detail.schema.ts` |
| Create/Update | `packages/contracts/src/customers/list-customers-query.schema.ts` |
| Create | `packages/contracts/src/customers/customer-address.schema.ts` |
| Create | `packages/contracts/src/customers/customer-contact-phone.schema.ts` |
| Update | `packages/contracts/src/customers/index.ts` |

---

## مراحل پیاده‌سازی

1. Audit API tasks 036-038 field lists
2. Implement schemas with zod refinements (primary address, phone format)
3. Shared error map fa
4. Unit tests: valid/invalid payloads
5. Type export `z.infer<>` for frontend
6. Document bigint string in contracts README if needed

---

## Edge Cases & Errors

| سناریو | Schema behavior |
|--------|-----------------|
| Empty phone | Zod fail |
| Invalid UUID categoryId | fail |
| Update with phone field | strip or fail — document fail |
| limit > 100 | coerce to 100 or fail |
| Invalid sort field | fail |

---

## تست

- [ ] Unit: each schema happy path
- [ ] Unit: phone normalization edge cases
- [ ] Unit: version missing on update → fail
- [ ] Contract test: sample API fixtures round-trip

---

## UX (اگر UI دارد)

- [ ] Form resolver zodResolver — IFP-053
- [ ] fa error messages on all fields

---

## Flow

N/A — contracts only

---

## Policy Alignment

- [ ] EXCELLENCE §8 all entity fields represented
- [ ] ADR-016 API versioning `/api/v1`
- [ ] ADR-017 phone schema shared
- [ ] No `any` — strict types

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §8
- `Phases/Phase-1-Seller-Panel` customer contracts if exist

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
