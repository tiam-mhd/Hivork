# IFP-TASK-023: Instant Search Debounce + Backend Search API Pattern

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-02-Filter-Search |
| ID | IFP-TASK-023 |
| Priority | P0 |
| Depends on | IFP-TASK-019, IFP-TASK-022 |
| Blocks | IFP-TASK-025, IFP Phase 03+ list APIs |
| Estimated | 12h |

---

## هدف

جستجوی **لحظه‌ای** با debounce در toolbar DataTable و الگوی **backend search** استاندارد — پارامتر `search` روی list endpoints با field whitelist، ترکیب با filter AST و cursor pagination. یک reference implementation روی `GET /customers`.

---

## معیار پذیرش

- [ ] `SearchInput` component — debounce 300ms، clear button، loading indicator
- [ ] Min 2 chars before search (configurable) — یا immediate for numeric/phone
- [ ] `ListQuerySchema` در contracts — `search`, `filter` (AST JSON), sort, cursor, limit
- [ ] `filterAstToWhere` + `searchToWhere` composable در application layer
- [ ] Reference: `ListCustomersUseCase` accepts full query DTO
- [ ] `GET /api/v1/customers` updated — search on name, phone (normalized), code
- [ ] Phone search: normalize `09xxxxxxxxx` via shared helper
- [ ] Empty search → omit param (full list with filters only)
- [ ] AbortController — cancel in-flight request on new search
- [ ] `useDataTableQuery` merges search into queryKey
- [ ] Document pattern in `docs/09-development/LIST-API-PATTERN.md`

---

## مشخصات فنی

### List Query Contract

```typescript
// packages/contracts/src/core/list-query.schema.ts
export const ListQuerySchema = DataTableQuerySchema.extend({
  search: z.string().max(200).optional(),
  filter: FilterAstSchema.optional(),
});
export type ListQueryDto = z.infer<typeof ListQuerySchema>;
```

### SearchInput Component

```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number; // default 300
  minLength?: number;  // default 2
  placeholder?: string;
  isLoading?: boolean;
}
```

```
apps/web/src/components/search-input/search-input.tsx
```

### Backend Pattern

```typescript
// packages/application/core/list/build-list-where.ts
export function buildListWhere(params: {
  tenantId: string;
  branchIds?: string[];
  search?: string;
  searchFields: SearchFieldConfig[];
  filter?: FilterAst;
  fieldMap: FieldMap;
}): Record<string, unknown>
```

### Search Field Config

```typescript
interface SearchFieldConfig {
  field: string;
  mode: 'contains' | 'prefix' | 'exact';
  normalize?: (v: string) => string; // phone normalize
}
```

### Customers Example

```http
GET /api/v1/customers?search=0912&limit=20&sortBy=createdAt&sortDir=desc
GET /api/v1/customers?search=رضا&filter={"root":{...}}
```

**Search fields whitelist:** `displayName`, `phone` (via User join), `customerCode`

### Controller Guard

```typescript
@Get()
@RequireAuth()
@RequireModule('installments')
@RequirePermission('installments.customer.view')
@ApplyDataScope()
async list(@Query() query: ListCustomersQueryDto, @Ctx() ctx: StaffContext) {
  return this.listCustomers.execute({ ...query, tenantId: ctx.tenantId, branchIds: ctx.branchIds });
}
```

### Response (unchanged paginated)

```json
{
  "items": [...],
  "nextCursor": "uuid-or-null",
  "hasNext": true,
  "totalCount": 142
}
```

### Performance

- `totalCount`: optional — expensive; use `hasNext` only by default
- Search + filter: composite index guidance in task comments for domain teams
- Max `search` length 200 — truncate server-side

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/components/search-input/search-input.tsx` |
| Create | `packages/contracts/src/core/list-query.schema.ts` |
| Create | `packages/application/core/list/build-list-where.ts` |
| Create | `packages/application/core/filter/filter-ast-to-prisma.ts` — complete |
| Create | `packages/application/core/filter/search-to-prisma.ts` |
| Update | `packages/application/installments/customers/list-customers.use-case.ts` |
| Update | `apps/api/src/modules/installments/customers/customers.controller.ts` |
| Create | `docs/09-development/LIST-API-PATTERN.md` |
| Update | `apps/web/src/hooks/use-data-table-query.ts` |

---

## مراحل پیاده‌سازی

1. `ListQuerySchema` in contracts
2. `buildListWhere` + ast translator
3. `searchToPrisma` with phone normalize
4. Update ListCustomersUseCase + controller
5. SearchInput component with debounce + abort
6. Wire to DataTable toolbar
7. Integration test: search + filter + sort + cursor
8. Write LIST-API-PATTERN.md
9. RBAC test: deny without permission

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| search 1 char | — | No API call (client gate) |
| search special chars `%_` | — | Escaped in ILIKE |
| filter + search empty results | 200 `[]` | Empty state «نتیجه‌ای یافت نشد» |
| Cross-tenant | 403 | Integration test fail |
| Invalid filter AST | 400 `FILTER_INVALID` | Toast + reset filter |
| Slow search | — | Loading spinner in input |

---

## تست

- [ ] Unit: phone normalize in search
- [ ] Unit: buildListWhere always adds tenantId + deletedAt
- [ ] Integration: search by name partial match
- [ ] Integration: search + cursor pagination
- [ ] Integration: cross-tenant fail
- [ ] RBAC: deny without `installments.customer.view`
- [ ] Component: debounce fires once after 300ms

---

## UX

- [ ] Placeholder: «جستجو نام، موبایل، کد…»
- [ ] Clear (×) when value non-empty
- [ ] RTL: icon on end (start in RTL)
- [ ] Excellence §6.4 search bar ✅

---

## Flow

```
User types → debounce → update search state
  → queryKey change → abort prior → GET list
  → results replace table (cursor reset to null)
Clear search → full list with active filters
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3.2
- [ ] ADR-015 — data scope in buildListWhere
- [ ] ADR-016 — `/api/v1/`
- [ ] No PII in logs — search term not logged

---

## مراجع

- `IFP-TASK-022-advanced-filter-builder.md`
- `docs/02-architecture/data-flow.md`
- `docs/09-development/DEVELOPMENT_RULES.md` §5.3

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | Reference API + doc |
| Policy | /25 | 25 | RBAC test listed |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **100** | ≥95 ✅ |
