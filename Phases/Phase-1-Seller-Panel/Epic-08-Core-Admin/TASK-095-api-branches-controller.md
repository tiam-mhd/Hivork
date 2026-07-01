# TASK-095: API — Branches Controller

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-08-Core-Admin |
| ID | TASK-095 |
| Priority | P0 |
| Depends on | TASK-089, TASK-094, TASK-042, TASK-043, TASK-045 |
| Blocks | — |
| Estimated | 5h |

---

## هدف

`BranchesController` — CRUD API شعب. NestJS `@Controller('v1/branches')`. Core module — **بدون** `@RequireModule('installments')`.

---

## Endpoints

### `GET /api/v1/branches`

| Item | Value |
|------|-------|
| Permission | `core.branch.view` |
| Query | `cursor`, `limit`, `status` (active) |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "شعبه اصلی",
      "address": "تهران، بازار موبایل",
      "phone": "02188888888",
      "isDefault": true,
      "isActive": true,
      "createdAt": "2025-01-01T08:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "hasNext": false, "nextCursor": null }
}
```

### `POST /api/v1/branches`

| Permission | `core.branch.create` |
| Audit | `branch.create` |

**Request:**

```json
{ "name": "شعبه غرب", "address": "تهران", "phone": "02144444444" }
```

**Response 201:** Branch object

### `GET /api/v1/branches/:id`

| Permission | `core.branch.view` |

### `PATCH /api/v1/branches/:id`

| Permission | `core.branch.update` |
| Audit | `branch.update` |

### `DELETE /api/v1/branches/:id`

| Permission | `core.branch.delete` |
| Note | Soft delete |
| Audit | `branch.delete` |

---

## Data Scope

Branch list for `dataScope=branch` staff: return only `assignedBranchIds` (read-only subset). Owner/manager: all branches.

| Scope | List | Mutate |
|-------|------|--------|
| `all` | all branches | if permission |
| `branch` | assigned only | denied (403) unless owner |
| `own` | assigned only | denied |

---

## Error Codes

| سناریو | HTTP | Code |
|--------|------|------|
| Delete default | 409 | `BRANCH_IS_DEFAULT` |
| Delete last branch | 409 | `DELETE_FORBIDDEN` |
| Not found | 404 | `BRANCH_NOT_FOUND` |
| Plan limit | 403 | `TENANT_PLAN_LIMIT_EXCEEDED` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/core/branches/branches.controller.ts` |
| Create | `apps/api/src/core/branches/branches.module.ts` |
| Create | `apps/api/src/core/branches/branches.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Controller with 5 routes
2. Zod validation pipes from TASK-094
3. Delegate to TASK-089 use cases
4. RBAC tests

---

## تست

- [ ] Integration: CRUD flow
- [ ] Integration: delete default → 409
- [ ] RBAC: cashier cannot create branch

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY
- [ ] ADR-009, ADR-015
- [ ] TASK-057 default branch prerequisite

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

---

## مراجع

- `docs/02-architecture/api-contracts.md` § branches
- `docs/02-architecture/rbac.md` — core.branch.*
