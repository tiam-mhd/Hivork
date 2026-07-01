# IFP-TASK-035: CustomerContactPhone Secondary Numbers

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-01-Customer-Schema-Extended |
| ID | IFP-035 |
| Priority | P0 |
| Depends on | IFP-033 |
| Blocks | IFP-036, IFP-037, IFP-041 |
| Estimated | 3h |

---

## هدف

مدل `CustomerContactPhone` برای **شماره‌های تماس ثانویه** مشتری tenant — مکمل شماره primary روی `User` (ADR-017). پوشش §۳ «شماره‌های تماس» بدون نقض یکتایی phone platform-wide.

---

## معیار پذیرش

- [ ] مدل `CustomerContactPhone`: tenantId, tenantCustomerId, phone (normalized), label (mobile, home, work, other), isWhatsApp?, isPrimarySecondary (optional flag)
- [ ] Unique: `(tenantId, phone)` — secondary نباید duplicate در tenant باشد
- [ ] Validation: secondary ≠ User.phone of linked GlobalCustomer (409 if same as primary unless explicit allow)
- [ ] Base fields + soft delete
- [ ] Index: `(tenantCustomerId)`, `(tenantId, phone)`
- [ ] Domain: normalize phone to 09xxxxxxxxx

---

## مشخصات فنی

### CustomerContactPhone fields

| فیلد | توضیح |
|------|--------|
| phone | string — normalized Iranian mobile |
| label | enum optional |
| isVerified | boolean default false — OTP future |
| notes | optional |
| + base fields | soft delete |

### قوانین business

- Primary phone **همیشه** از `User.phone` via GlobalCustomer
- Secondary phones فقط برای تماس — **نه** login identity
- Import Excel (IFP-041): column «شماره ۲» maps here
- Search (IFP-040): match secondary phones in list query

### API shape (for IFP-039)

- Nested array `contactPhones[]` در create/update customer detail
- Max 5 secondary per customer (tenant setting default 5)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | migration |
| Create | `packages/domain/src/core/customer/customer-contact-phone.entity.ts` |
| Create | `packages/application/src/ports/customer-contact-phone.repository.port.ts` |

---

## مراحل پیاده‌سازی

1. Prisma model + unique constraint
2. Domain entity + normalizePhone reuse from auth module
3. Repository port: upsertMany for customer, listByCustomerId
4. Unit tests normalization + duplicate detection
5. Migrate

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate phone in tenant (another customer) | 409 | CUSTOMER_PHONE_EXISTS |
| Same as primary User.phone | 422 | SECONDARY_EQUALS_PRIMARY |
| Invalid phone format | 422 | VALIDATION_ERROR |
| More than max secondary | 422 | LIMIT_EXCEEDED |
| Soft delete secondary | — | removed from search index |

---

## تست

- [ ] Unit: phone normalization
- [ ] Unit: duplicate tenant phone rejection
- [ ] Integration: create customer with 2 secondary phones

---

## UX (اگر UI دارد)

- [ ] N/A — form repeater در IFP-053

---

## Flow (اگر flow دارد)

N/A

---

## Policy Alignment

- [ ] ADR-017 — primary on User only
- [ ] EXCELLENCE §2.1 base fields
- [ ] SOFT-DELETE-POLICY

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md`
- `docs/08-decisions/ADR-017-user-platform-identity.md`
- `docs/01-product/installment-module-features.md` §۳

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
