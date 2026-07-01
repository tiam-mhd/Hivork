# IFP-TASK-025: Excel Export Service (Streaming, Tenant Scope)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-03-Export-Print |
| ID | IFP-TASK-025 |
| Priority | P0 |
| Depends on | IFP-TASK-019, IFP-TASK-023 |
| Blocks | IFP-TASK-026, IFP Phase 03+ export buttons |
| Estimated | 14h |

---

## هدف

سرویس **خروجی Excel** با streaming response — اعمال همان `search` + `filter` + `sort` لیست فعلی — tenant-scoped و branch-scoped (ADR-015). الگوی generic `ExportService` برای تمام resourceها با column map declarative.

---

## معیار پذیرش

- [ ] `ExportService` در application layer — resource-agnostic
- [ ] Streaming XLSX via `exceljs` stream workbook — no full memory load
- [ ] Endpoint pattern: `POST /api/v1/{resource}/export` با body query mirror list
- [ ] Reference: `POST /api/v1/customers/export`
- [ ] Permission: `installments.customer.export` (per resource)
- [ ] Audit: `export.requested` با resource, rowCount, filterHash
- [ ] Max rows: env `EXPORT_MAX_ROWS` default 50_000 — `403 EXPORT_LIMIT_EXCEEDED`
- [ ] Async option for large exports: job queue + download link (document; implement if >10k)
- [ ] UI: Export button in DataTable toolbar → download `.xlsx`
- [ ] Filename: `{resource}-{tenantSlug}-{date}.xlsx`
- [ ] Money columns: display تومان + raw rial sheet note in header row
- [ ] Selected rows only mode: `ids[]` in body (from IFP-TASK-020)

---

## مشخصات فنی

### Request Contract

```typescript
// packages/contracts/src/core/export.schema.ts
export const ExportRequestSchema = ListQuerySchema.extend({
  format: z.literal('xlsx').default('xlsx'),
  columns: z.array(z.string()).optional(), // subset; default all exportable
  ids: z.array(z.string().uuid()).optional(), // bulk selection mode
  locale: z.enum(['fa-IR', 'en']).default('fa-IR'),
});
```

### Endpoint

```http
POST /api/v1/customers/export
Authorization: Bearer ...
X-Branch-Id: {uuid}
Content-Type: application/json

{
  "search": "رضا",
  "filter": { "root": { ... } },
  "sortBy": "createdAt",
  "sortDir": "desc",
  "columns": ["displayName", "phone", "balanceRial"]
}

→ 200
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="customers-demo-1405-04-10.xlsx"
(stream body)
```

### Export Column Definition

```typescript
interface ExportColumnDef<T> {
  id: string;
  header: string; // fa label
  headerEn?: string;
  accessor: (row: T) => string | number | Date;
  width?: number;
  moneyRial?: boolean;
}
```

### ExportService Pattern

```typescript
// packages/application/core/export/export.service.ts
export class ExportService {
  async exportToXlsx<T>(params: {
    ctx: StaffContext;
    resourceKey: string;
    columns: ExportColumnDef<T>[];
    fetchBatch: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>;
    maxRows: number;
  }): Promise<ReadableStream>
}
```

- Batch fetch 500 rows per cursor iteration
- Stop when `maxRows` or no next cursor
- Same `buildListWhere` as list (IFP-TASK-023)

### Controller

```typescript
@Post('export')
@RequireAuth()
@RequireModule('installments')
@RequirePermission('installments.customer.export')
@ApplyDataScope()
async exportCustomers(@Body() dto: ExportCustomersDto, @Ctx() ctx: StaffContext, @Res() res: Response) {
  const stream = await this.exportCustomersUseCase.execute(dto, ctx);
  res.setHeader('Content-Type', 'application/vnd...sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  stream.pipe(res);
}
```

### Audit Log

```typescript
{
  action: 'export.requested',
  entity: 'customers',
  new_value: { rowCount, filterHash: sha256(JSON.stringify(dto)), format: 'xlsx' },
  tenant_id: ctx.tenantId,
}
```

### UI Integration

```tsx
<ExportButton
  permission="installments.customer.export"
  onExport={() => api.customers.export(currentListQuery)}
  isLoading={exporting}
/>
```

- Toast «در حال آماده‌سازی فایل…»
- Error toast on limit exceeded

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/core/export/export.service.ts` |
| Create | `packages/application/installments/customers/export-customers.use-case.ts` |
| Create | `packages/contracts/src/core/export.schema.ts` |
| Create | `apps/api/src/modules/installments/customers/export-customers.controller.ts` |
| Create | `apps/web/src/components/data-table/export-button.tsx` |
| Update | `packages/contracts/src/installments/permissions.ts` — add export permission |
| Update | seed roles — grant export to owner/manager |

---

## مراحل پیاده‌سازی

1. Export contracts + permission
2. ExportService with exceljs stream
3. ExportCustomersUseCase — reuse list where builder
4. Controller streaming response
5. Audit integration
6. ExportButton UI + blob download
7. Selected ids mode
8. Integration test: tenant scope + row count cap
9. RBAC deny test

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Rows > max | 403 `EXPORT_LIMIT_EXCEEDED` | Toast با راهنمای فیلتر بیشتر |
| Empty export | 200 empty sheet | Toast «داده‌ای برای خروجی نیست» |
| Invalid columns | 400 `EXPORT_COLUMN_INVALID` | |
| Concurrent exports | — | Rate limit 5/min per staff |
| ids + filter mismatch | — | ids must pass same where guard |
| Cross-tenant | 403 | Test fail |

---

## تست

- [ ] Integration: export 100 customers streams valid xlsx
- [ ] Integration: filter applied matches list count sample
- [ ] Integration: cross-tenant fail
- [ ] RBAC: deny without export permission
- [ ] Unit: money column formatting
- [ ] Integration: ids-only export

---

## UX

- [ ] Export in toolbar next to column settings
- [ ] Loading disables button
- [ ] Success: browser download starts
- [ ] Permission hidden if !hasPermission

---

## Flow

```
Click «خروجی Excel» → POST export with current query state
  → stream download
  → audit logged
Bulk: select rows → export selected → ids in body
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3.2 — export where business needs
- [ ] ADR-007 — money in export
- [ ] ADR-015 — branch scope in fetch
- [ ] ADR-004 — export permission
- [ ] Audit mandatory

---

## مراجع

- `IFP-TASK-023-instant-search-debounce-api.md`
- `docs/06-operations/security-and-audit.md`
- `docs/01-product/installment-module-features.md` — خروجی Excel

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | |
| Policy | /25 | 25 | Audit + RBAC |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **100** | ≥95 ✅ |
