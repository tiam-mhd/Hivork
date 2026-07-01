# ADR-017: User Platform Identity

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04/09  
**مرتبط:** ADR-002, ADR-011, ADR-013

---

## زمینه

`phone` قبلاً روی `Staff` و `GlobalCustomer` جدا بود. این باعث می‌شد:

- ثبت tenant دوم با همان phone (multi-tenant owner) مسدود شود
- هویت platform-per-actor تکراری و ناسازگار باشد
- lookup و pseudonymize پراکنده باشد

---

## تصمیم

### مدل هویت

```
User (platform identity — phone unique)
 ├── Staff[] (per tenant — B2B actor)
 └── GlobalCustomer? (B2C profile — 1:1)
         └── TenantCustomer (junction — NOT direct to User)
```

| Entity | نقش |
|--------|-----|
| **User** | هویت platform — `phone` unique |
| **Staff** | عضویت B2B per tenant — FK `userId`؛ unique `(tenantId, userId)` |
| **GlobalCustomer** | پروفایل B2C — FK `userId` unique (1:1) |
| **TenantCustomer** | junction tenant ↔ GlobalCustomer — **نه** مستقیم به User |
| **PlatformUser** | جدا — تیم Hivork |

### Auth

- Actors (`staff` / `customer`) و session/cookie جدا — User فقط identity مشترک
- **Register tenant:** OTP verify → `verifiedToken` — **بدون** block global برای phone موجود
- **Login staff multi-tenant:** `NEED_TENANT_SLUG` وقتی بیش از یک Staff membership
- **Login customer:** `User.findOrCreateByPhone` → `GlobalCustomer` by `userId`

### API / DTO

- API/DTO همچنان `phone` expose می‌کند (join از `User` در repository)
- Domain entity `Staff` / `GlobalCustomer`: FK `userId` — phone در application layer

### Privacy

- Pseudonymize customer: `User.phone` + فیلدهای `GlobalCustomer`
- Soft delete only — ADR-013

---

## پیامد

- Migration `20260630120000_add_user_identity`: backfill `users` از distinct staff/global_customer phones
- Repository: همه queryهای phone از join `User`
- Seed: ایجاد `User` قبل از `Staff` / `GlobalCustomer`
- حذف `STAFF_ALREADY_EXISTS` از register OTP flow

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` v1.1
- `docs/08-decisions/adr-log.md` — ADR-017
- `prisma/migrations/20260630120000_add_user_identity/migration.sql`
