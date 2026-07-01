# IFP-TASK-047: Internal Notes CRUD

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-05-Customer-History |
| ID | IFP-047 |
| Priority | P0 |
| Depends on | IFP-034, IFP-039 |
| Blocks | IFP-046, IFP-053 |
| Estimated | 5h |

---

## هدف

CRUD **یادداشت داخلی** ساخت‌یافته (`CustomerNote`) — staff-only، pin، author tracking — §۳ یادداشت داخلی. مکمل فیلد legacy `internalNotes` روی TenantCustomer.

---

## معیار پذیرش

- [ ] POST `/api/v1/customers/:id/notes` — body, isPinned?
- [ ] GET list notes — cursor, pinned first
- [ ] PATCH `/api/v1/customers/:id/notes/:noteId` — body, isPinned (author or admin)
- [ ] DELETE soft-delete note — author within 24h or `installments.customer.note.delete.any`
- [ ] authorStaffId immutable — set from JWT staff
- [ ] Never exposed to customer actor APIs
- [ ] Audit `customer.note.create|update|delete`
- [ ] Permission: `installments.customer.note.create|update|delete`

---

## مشخصات فنی

### Endpoints

| Method | Path | Action |
|--------|------|--------|
| GET | `/customers/:id/notes` | List |
| POST | `/customers/:id/notes` | Create |
| PATCH | `/customers/:id/notes/:noteId` | Update |
| DELETE | `/customers/:id/notes/:noteId` | Soft delete |

### List ordering

1. isPinned DESC  
2. createdAt DESC  

### Edit window

Author can edit/delete own note within 24h — after requires elevated permission

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/customer-notes.use-case.ts` |
| Update | `apps/api/src/customers/customer-notes.controller.ts` |
| Update | contracts CustomerNote schemas IFP-039 |

---

## مراحل پیاده‌سازی

1. Create/list/update/delete use cases
2. Author permission rules
3. Controller + guards
4. Integration tests
5. Wire to timeline IFP-046

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Empty body | 422 | VALIDATION_ERROR |
| Edit others note | 403 | PERMISSION_DENIED |
| Note on deleted customer | 404 | CUSTOMER_NOT_FOUND |
| Body > 5000 chars | 422 | VALIDATION_ERROR |

---

## تست

- [ ] Integration: CRUD happy path
- [ ] Integration: 24h edit window enforce
- [ ] RBAC: customer token cannot access notes endpoint

---

## UX (اگر UI دارد)

- [ ] Notes tab with composer — IFP-053
- [ ] Pin icon toggle
- [ ] Author name + relative time fa
- [ ] Confirm delete

---

## Flow

```
Entry: detail → notes tab
List existing → add note textarea → save
Pin note → stays top
Edit own recent → inline
Delete → confirm
Exit: note appears in timeline IFP-046
```

---

## Policy Alignment

- [ ] Staff-only — ADR actor separation
- [ ] SOFT-DELETE-POLICY
- [ ] Audit on mutations

---

## مراجع

- IFP-034 CustomerNote model
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
