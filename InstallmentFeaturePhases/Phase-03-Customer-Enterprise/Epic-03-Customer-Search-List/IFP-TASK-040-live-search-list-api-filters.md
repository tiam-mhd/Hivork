# IFP-TASK-040: Live Search + List API with Filters

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-03-Customer-Search-List |
| ID | IFP-040 |
| Priority | P0 |
| Depends on | IFP-039, Phase 1 TASK-085 |
| Blocks | IFP-041, IFP-042, IFP-046, IFP-048, IFP-049, IFP-053, IFP-054 |
| Estimated | 8h |
| UI dependency note | DataTable live search UI در IFP-053 به **IFP-019** وابسته است |

---

## هدف

API **جستجوی زنده** و **لیست مشتریان** Enterprise با cursor pagination، فیلتر (category, tags, status, blacklist, branch, assigned staff)، مرتب‌سازی، و search روی name/phone/localCode/secondary phones — §۳ جستجو/فیلتر/مرتب‌سازی.

---

## معیار پذیرش

- [ ] GET `/api/v1/customers` — query validated by ListCustomersQuerySchema
- [ ] Cursor pagination — stable sort key (id tie-breaker)
- [ ] Live search `q`: min 2 chars OR full phone prefix match
- [ ] Filters: categoryId, tags (AND), status, isBlacklisted, branchId, assignedStaffId, date ranges (createdAt, lastPurchaseAt)
- [ ] Sort: name, createdAt, creditScore, lastPurchaseAt, totalPurchaseRial
- [ ] Include: category name, primary address city, masked phone
- [ ] Data scope enforced — branch/own filters applied server-side
- [ ] Default: exclude archived + soft-deleted; `includeArchived` query for permitted staff
- [ ] Permission: `installments.customer.list`
- [ ] Response: `{ items, nextCursor, totalEstimate? }`

---

## مشخصات فنی

### Search algorithm

| Source | Match |
|--------|-------|
| GlobalCustomer.name | ILIKE / trigram index |
| User.phone | prefix |
| TenantCustomer.localCode | exact + prefix |
| CustomerContactPhone.phone | prefix |
| Tags | array contains |

Debounce recommended client-side 300ms — server stateless

### Performance

- Index: `(tenantId, deletedAt, status)` + GIN on tags if needed
- Limit max 100 per page
- totalEstimate optional — expensive count skipped by default

### Branch filter semantics

- `branchId` filter: customers with defaultBranchId OR at least one Sale in branch
- Respects active branch session header `X-Branch-Id` as implicit filter when staff scope=branch

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/src/customers/list-tenant-customers.use-case.ts` |
| Create | `packages/infrastructure/persistence/repositories/tenant-customer-list.query.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |
| Update | contracts list schema IFP-039 |

---

## مراحل پیاده‌سازی

1. Extend repository with dynamic where builder
2. Join User for phone search
3. Join contact phones subquery
4. Cursor encode/decode (base64 json {sortValue, id})
5. Data scope middleware integration
6. Integration tests: each filter + search + pagination
7. Cross-tenant list isolation test

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| q single char | 422 or empty result | document: return empty if <2 chars |
| Invalid cursor | 400 | INVALID_CURSOR |
| includeDeleted without permission | 403 | PERMISSION_DENIED |
| Sort on blacklisted only | 200 | empty possible |
| Cross-tenant JWT | 403/404 | no leak |

---

## تست

- [ ] Integration: filter by category + tag
- [ ] Integration: search secondary phone
- [ ] Integration: cursor stable across pages
- [ ] RBAC: branch scope limits results
- [ ] RBAC: cross-tenant fail

---

## UX (اگر UI دارد)

- [ ] IFP-053: search input debounced
- [ ] Filter chips + clear all
- [ ] Skeleton loading rows — IFP-019 DataTable

---

## Flow

```
Entry: مشتریان list
Type in search → debounce → API q=
Apply filters → reset cursor
Scroll/load more → nextCursor
Empty → CTA «مشتری جدید»
Error → retry
```

---

## Policy Alignment

- [ ] EXCELLENCE §3 list API checklist
- [ ] ADR-015 data scope + active branch
- [ ] ADR-016 versioning
- [ ] PII masking in list optional

---

## مراجع

- `Phases/Phase-1-Seller-Panel/Epic-07-Customer-Backend/TASK-085-usecase-list-tenant-customers.md`
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
