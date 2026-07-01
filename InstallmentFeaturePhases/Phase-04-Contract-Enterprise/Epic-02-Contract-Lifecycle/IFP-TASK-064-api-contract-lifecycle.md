# IFP-TASK-064: API — Contract Lifecycle Endpoints

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-02-Contract-Lifecycle |
| ID | IFP-TASK-064 |
| Priority | P0 |
| Depends on | IFP-TASK-060, IFP-TASK-061, IFP-TASK-062, IFP-TASK-063, IFP-TASK-058 |
| Blocks | IFP-076, IFP-078 |
| Estimated | 8h |

---

## هدف

NestJS controller endpoints برای تمام عملیات lifecycle قرارداد Enterprise + list versions/attachments + change status — با guards کامل.

---

## معیار پذیرش

- [ ] `SalesEnterpriseController` or extend `SalesController`
- [ ] All endpoints: `@RequireAuth()`, `@RequireModule('installments')`, permission per action, `@ApplyDataScope()`
- [ ] Zod validation via contracts package
- [ ] Endpoints table below implemented
- [ ] Error codes documented
- [ ] OpenAPI/sync `api-contracts.md` § sales enterprise
- [ ] `X-Branch-Id` header enforced where branch-scoped

---

## مشخصات فنی

### Endpoints

| Method | Path | Permission | Use Case |
|--------|------|------------|----------|
| POST | `/api/v1/sales/:id/extend` | `installments.sale.extend` | IFP-060 |
| POST | `/api/v1/sales/:id/copy` | `installments.sale.copy` | IFP-061 |
| POST | `/api/v1/sales/:id/terminate` | `installments.sale.terminate` | IFP-062 |
| POST | `/api/v1/sales/:id/close` | `installments.sale.close` | IFP-063 |
| POST | `/api/v1/sales/:id/archive` | `installments.sale.archive` | IFP-063 |
| POST | `/api/v1/sales/:id/unarchive` | `installments.sale.archive` | IFP-063 |
| POST | `/api/v1/sales/:id/status` | `installments.sale.change_status` | ChangeStatus UC |
| GET | `/api/v1/sales/:id/versions` | `installments.sale.view` | List versions |
| GET | `/api/v1/sales/:id/versions/:versionNumber` | `installments.sale.view` | Get snapshot |
| GET | `/api/v1/sales/:id/attachments` | `installments.sale.view` | List attachments |
| POST | `/api/v1/sales/:id/attachments` | `installments.sale.edit` | Create attachment |
| DELETE | `/api/v1/sales/:id/attachments/:attachmentId` | `installments.sale.edit` | Soft delete attachment |
| POST | `/api/v1/sales/:id/restore` | `core.data.restore` | Restore sale |
| GET | `/api/v1/sales/:id` | `installments.sale.view` | Enterprise detail (extend existing) |

### ChangeSaleStatusUseCase

Validates transition via domain matrix — rejects invalid with `INVALID_STATUS_TRANSITION`.

### List sales query extensions

```
?includeArchived=true
?status=terminated,closed
?contractNumber=CTR-2025-00042
```

### Error table

| Code | HTTP |
|------|------|
| `INVALID_STATUS_TRANSITION` | 409 |
| `VERSION_CONFLICT` | 409 |
| `SALE_ARCHIVED_READONLY` | 409 |
| `PERMISSION_DENIED` | 403 |
| `SALE_NOT_FOUND` | 404 |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `apps/api/src/modules/installments/sales-enterprise.controller.ts` |
| Create | `packages/application/installments/change-sale-status.use-case.ts` |
| Create | `packages/application/installments/list-contract-versions.use-case.ts` |
| Update | `docs/02-architecture/api-contracts.md` |
| Update | `docs/02-architecture/rbac.md` — new permissions |

---

## مراحل پیاده‌سازی

1. Register new permissions in seed
2. Wire use cases to controller methods
3. Zod pipe on request bodies
4. Extend GET sale to enterprise DTO
5. RBAC integration tests
6. Update api-contracts.md

---

## Edge Cases & Errors

See individual use case tasks + attachment limits from IFP-057.

---

## تست

- [ ] RBAC: each endpoint allow + deny
- [ ] Integration: full lifecycle extend → terminate → close → archive
- [ ] Cross-tenant: all endpoints 404
- [ ] Contract test: request/response matches Zod schemas

---

## UX

IFP-076, IFP-077 consume these endpoints.

---

## Flow

Staff actor only — JWT `actor: staff`, `tenantId` from token.

---

## Policy Alignment

- [ ] RBAC per `.cursor/rules/02-security-rbac-audit.mdc`
- [ ] Audit on mutations
- [ ] ADR-016 API versioning

---

## مراجع

- IFP-TASK-058–063
- `docs/02-architecture/api-contracts.md`
- `docs/02-architecture/rbac.md`

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
