# List API Pattern

Standard pattern for cursor-paginated admin lists with instant search, advanced filters, and RBAC data scope.

## Contract

Shared query shape in `packages/contracts/src/core/list-query.schema.ts`:

| Param | Type | Notes |
|-------|------|--------|
| `cursor` | string | Opaque cursor from previous response |
| `limit` | 1–100 | Default 20 |
| `sortBy` / `sortDir` | string / `asc` \| `desc` | Resource-specific whitelist |
| `search` | string, max 200 | Trimmed; empty omitted |
| `filter` | Filter AST (URL base64url or JSON) | Optional; validated server-side |

Resource-specific schemas (e.g. `ListCustomersQuerySchema`) extend this with domain fields (`tags`, `status`, combined `sort` enum).

## Application layer

1. **`buildListWhere`** (`packages/application/src/core/list/build-list-where.ts`) — composes:
   - `tenantId` + `deletedAt: null` (always)
   - `searchToWhere` — OR across whitelisted fields
   - `filterAstToWhereClause` — AST → Prisma fragment

2. **`searchToWhere`** — escapes `%` / `_` for ILIKE; phone terms normalized via `normalizePhone` when 4+ digits.

3. **Data scope** (ADR-015) — applied in repository/use case via `buildScopeWhere`, not in client input.

## Controller

```typescript
@Get()
@RequireAuth('staff')
@RequireModule('installments')
@RequirePermission('installments.customer.view')
@ApplyDataScope()
async list(@Query() query: unknown, @CurrentStaff() staff: StaffContext) {
  const parsed = ListCustomersQuerySchema.safeParse(query);
  // FILTER_INVALID → 400
  return this.listUseCase.execute({ ...parsed.data, tenantId: staff.tenantId, staffContext });
}
```

Never trust client `tenantId`. Always inject from JWT.

## Reference: GET /api/v1/customers

**Search whitelist:** display name (`globalCustomer.name`), phone (`globalCustomer.user.phone`, normalized), local code (`localCode`).

```http
GET /api/v1/customers?search=0912&limit=20&sort=createdAt:desc
GET /api/v1/customers?search=رضا&filter=<base64url-ast>
```

Response (unchanged):

```json
{
  "data": [...],
  "meta": {
    "total": 142,
    "hasNext": true,
    "nextCursor": "..."
  }
}
```

`meta.total` is optional for expensive queries; prefer `hasNext` for infinite scroll.

## Frontend

- **`SearchInput`** — 300ms debounce, min 2 chars (immediate for phone/numeric 4+ digits), clear button, loading spinner.
- **`useDataTableQuery`** — merges `search` into `queryKey`; passes `AbortSignal` to `fetchFn` (TanStack Query cancels in-flight on key change).
- URL sync: `?search=` + `?filter=` (base64url) alongside sort/limit/cursor.

## Security & audit

- RBAC + module guard on every list endpoint.
- Cross-tenant access must fail (integration test).
- Do **not** log search terms (PII).

## Adding a new list

1. Define `ListXQuerySchema` extending shared fields.
2. Add `X_SEARCH_FIELDS` + `X_FILTER_FIELD_MAP` in application.
3. Use `buildListWhere` in list use case.
4. Wire `SearchInput` + `FilterBuilder` in DataTable toolbar.
5. Integration test: search, filter, cursor, tenant isolation.

## Related

- `IFP-TASK-022` — Filter AST
- `IFP-TASK-023` — Instant search
- `docs/02-architecture/rbac.md` — data scope
- `SOFT-DELETE-POLICY.md` — `deletedAt: null` in all list queries
