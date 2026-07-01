# IFP-TASK-022: Advanced Multi-Condition Filter Builder

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-02-Filter-Search |
| ID | IFP-TASK-022 |
| Priority | P0 |
| Depends on | IFP-TASK-019 |
| Blocks | IFP-TASK-023, IFP-TASK-024, IFP-TASK-027 |
| Estimated | 14h |

---

## هدف

کامپوننت **FilterBuilder** برای فیلتر پیشرفته چندشرطی — گروه AND/OR، فیلد/عملگر/مقدار — با AST serializable برای backend و UI popover/drawer در toolbar DataTable. این الگو در تمام لیست‌های Enterprise استفاده می‌شود.

---

## معیار پذیرش

- [ ] Filter AST Zod schema در contracts — validated client + server
- [ ] UI: add condition، add group، remove، nest one level (group within root)
- [ ] Operators per field type: string, number, date, enum, boolean, uuid, money (bigint string)
- [ ] Field catalog per `resourceKey` — `FilterFieldDef[]` from consumer
- [ ] Quick filters chips (preset conditions) optional slot
- [ ] Active filter count badge on toolbar button
- [ ] «پاک کردن همه» reset
- [ ] Apply / Cancel in drawer mode
- [ ] URL query sync: `?filter=` base64url compressed JSON (optional, max 2KB)
- [ ] Branch/status presets integrated where applicable (ADR-015)
- [ ] RTL form layout

---

## مشخصات فنی

### Filter AST Schema

```typescript
// packages/contracts/src/ui/filter-ast.schema.ts
export const FilterOperatorSchema = z.enum([
  'eq', 'neq', 'contains', 'not_contains', 'starts_with', 'ends_with',
  'gt', 'gte', 'lt', 'lte', 'between',
  'in', 'not_in',
  'is_null', 'is_not_null',
]);

export const FilterConditionSchema = z.object({
  type: z.literal('condition'),
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.unknown().optional(), // type depends on field
});

export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    type: z.literal('group'),
    logic: z.enum(['and', 'or']),
    children: z.array(z.union([FilterConditionSchema, FilterGroupSchema])).min(1),
  }),
);

export const FilterAstSchema = z.object({
  root: FilterGroupSchema,
});

export type FilterAst = z.infer<typeof FilterAstSchema>;
```

### Field Definition

```typescript
export interface FilterFieldDef {
  id: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'uuid' | 'money_rial';
  operators?: FilterOperator[]; // default per type
  enumOptions?: { value: string; label: string }[];
  placeholder?: string;
}
```

### Operator Matrix (default)

| Type | Operators |
|------|-----------|
| string | contains, eq, starts_with, is_null |
| number / money_rial | eq, gt, gte, lt, lte, between |
| date | eq, gt, gte, lt, lte, between |
| enum | in, eq, neq |
| boolean | eq |
| uuid | eq, in |

### FilterBuilder Component

```
apps/web/src/components/filter-builder/
├── filter-builder.tsx
├── filter-group.tsx
├── filter-condition-row.tsx
├── filter-field-select.tsx
├── filter-operator-select.tsx
├── filter-value-input.tsx
└── index.ts
```

### Toolbar Integration

```tsx
<FilterBuilderButton
  fields={customerFilterFields}
  value={filterAst}
  onChange={setFilterAst}
  onApply={() => refetch()}
/>
```

### Backend Translation (documented pattern — implement in IFP-TASK-023)

```typescript
// packages/application/core/filter/filter-ast-to-prisma.ts
export function filterAstToWhere(ast: FilterAst, fieldMap: FieldMap, ctx: TenantContext): PrismaWhere
```

- `tenantId` + `deletedAt: null` always injected
- branch scope from ctx when field is branch-scoped
- SQL injection safe — parameterized only

### Example Customer Fields

| id | label | type |
|----|-------|------|
| `name` | نام | string |
| `phone` | موبایل | string |
| `status` | وضعیت | enum |
| `createdAt` | تاریخ ثبت | date |
| `balanceRial` | مانده (ریال) | money_rial |
| `branchId` | شعبه | uuid |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/ui/filter-ast.schema.ts` |
| Create | `apps/web/src/components/filter-builder/filter-builder.tsx` |
| Create | `apps/web/src/components/filter-builder/filter-condition-row.tsx` |
| Create | `apps/web/src/components/filter-builder/filter-value-input.tsx` |
| Create | `apps/web/src/lib/filter-fields/customers.ts` — example field catalog |
| Create | `packages/application/core/filter/filter-ast-to-prisma.ts` — skeleton |
| Update | `packages/contracts/src/index.ts` |

---

## مراحل پیاده‌سازی

1. Zod AST schemas + types
2. FilterConditionRow — field/operator/value cascade
3. FilterGroup — AND/OR toggle + children
4. FilterBuilder root — add condition/group
5. Drawer UI with Apply/Cancel
6. Active count badge
7. URL sync helper (optional)
8. Customer field catalog + demo on list page
9. Document prisma translator interface for 023

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Invalid operator for field type | Disable in UI; server 400 `FILTER_INVALID` |
| Empty group | Block apply — validation message |
| between without 2 values | Inline validation |
| money non-numeric | Zod regex `^\d+$` |
| filter AST > max depth (2) | Block nest in UI |
| Unknown field in saved filter | Skip with warning toast |
| Date timezone | Store ISO UTC; display in tenant TZ |

---

## تست

- [ ] Unit: FilterAstSchema valid/invalid cases
- [ ] Unit: operator matrix per field type
- [ ] Component: add/remove condition
- [ ] Component: AND/OR group toggle
- [ ] Unit: filterAstToWhere injects tenantId (mock)

---

## UX

### Form — Excellence §5

- [ ] Labels fa for field, operator, value
- [ ] Help: «چند شرط با «و» / «یا» ترکیب کنید»
- [ ] Validation messages fa
- [ ] Mobile: full-screen drawer
- [ ] Date inputs use DatePicker (IFP-TASK-030 stub until ready)

---

## Flow

```
Click «فیلتر» → drawer opens with current AST
  → add/edit conditions → Apply
  → onApply → update query → DataTable refetch
  → badge shows active count
Clear all → empty AST → refetch unfiltered
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3.2 — filter on list APIs
- [ ] ADR-015 — branch field respects data scope
- [ ] ADR-007 — money_rial as bigint string in AST

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §3.2
- `IFP-TASK-019-datatable-core-component.md`
- `docs/01-product/installment-module-features.md` — فیلتر پیشرفته

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | Full AST + UI |
| Policy | /25 | 24 | |
| Executability | /25 | 25 | |
| Alignment | /15 | 14 | |
| **جمع** | **/100** | **98** | ≥95 ✅ |
