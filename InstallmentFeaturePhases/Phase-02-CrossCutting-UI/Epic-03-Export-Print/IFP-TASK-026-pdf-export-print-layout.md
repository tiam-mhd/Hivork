# IFP-TASK-026: PDF Export + Print Layout System

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-03-Export-Print |
| ID | IFP-TASK-026 |
| Priority | P0 |
| Depends on | IFP-TASK-025 |
| Blocks | Phase 07 reports print layouts |
| Estimated | 12h |

---

## هدف

سیستم **layout چاپ/PDF** یکسان — header tenant (logo, name)، footer (date, page number)، RTL typography — برای لیست‌ها و گزارش‌ها. خروجی PDF server-side و **چاپ** client-side از همان HTML template.

---

## معیار پذیرش

- [ ] `PrintLayout` React component — A4 portrait default, landscape option
- [ ] `PdfExportService` — HTML → PDF via puppeteer/playwright in worker OR `@react-pdf/renderer` (choose one, document in ADR note)
- [ ] Endpoint: `POST /api/v1/{resource}/export` with `format: 'pdf'`
- [ ] Reference: customers list PDF (subset columns, max 500 rows for PDF)
- [ ] Client print: `window.print()` on dedicated `/print` route with `?snapshot=` token
- [ ] Print CSS `@media print` — hide nav, sidebar
- [ ] Tenant branding: logo, name, taxId optional from tenant settings
- [ ] Page numbers «صفحه {n} از {m}»
- [ ] Jalali date in header when locale fa-IR (IFP-TASK-030 integration point)
- [ ] Permission: same as Excel export per resource
- [ ] Audit: `export.requested` format pdf

---

## مشخصات فنی

### Format Extension

```typescript
export const ExportFormatSchema = z.enum(['xlsx', 'pdf']);
```

### Print Layout Component

```
apps/web/src/components/print/
├── print-layout.tsx
├── print-header.tsx
├── print-footer.tsx
├── print-table.tsx
└── print-styles.css
```

```tsx
<PrintLayout
  title="لیست مشتریان"
  tenant={tenantBranding}
  locale="fa-IR"
  orientation="portrait"
>
  <PrintTable columns={columns} rows={rows} />
</PrintLayout>
```

### PDF Generation (recommended: worker job)

```
apps/scheduler or apps/api worker:
  packages/application/core/export/pdf-export.service.ts
```

Flow for PDF:
1. `POST /customers/export { format: 'pdf', ... }`
2. If rows ≤ 500: sync generate → stream PDF
3. If rows > 500: `202 Accepted` + `{ jobId, statusUrl }` (optional P1 — document)

**Puppeteer pattern:**
```typescript
const html = renderPrintLayoutToHtml(data);
const pdf = await page.pdf({ format: 'A4', printBackground: true });
```

### Print Route (client)

```
apps/web/src/app/(admin)/print/[resource]/page.tsx
```

- Short-lived token `GET /api/v1/print-snapshots/:token` — Redis TTL 5min
- Snapshot contains: rows, columns, tenant branding, query metadata
- Auto `window.print()` on load optional

### Create Snapshot API

```http
POST /api/v1/print-snapshots
{ "resourceKey": "customers", "listQuery": {...}, "columns": [...] }
→ 201 { "token": "...", "expiresAt": "..." }
```

### Print CSS Essentials

```css
@media print {
  .no-print { display: none !important; }
  @page { size: A4; margin: 12mm; }
  body { font-family: var(--font-fa); direction: rtl; }
}
```

### PDF Row Limit

| Format | Max rows | Reason |
|--------|----------|--------|
| xlsx | 50_000 | IFP-TASK-025 |
| pdf | 500 | memory + UX |
| print | 500 | browser stability |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/components/print/print-layout.tsx` |
| Create | `apps/web/src/components/print/print-table.tsx` |
| Create | `apps/web/src/components/print/print-styles.css` |
| Create | `apps/web/src/app/(admin)/print/[resource]/page.tsx` |
| Create | `packages/application/core/export/pdf-export.service.ts` |
| Create | `packages/application/core/print/create-print-snapshot.use-case.ts` |
| Create | `apps/api/src/modules/core/print/print-snapshots.controller.ts` |
| Update | `packages/contracts/src/core/export.schema.ts` — pdf format |
| Update | `apps/web/src/components/data-table/export-button.tsx` — PDF + Print menu |

---

## مراحل پیاده‌سازی

1. PrintLayout components + CSS
2. Print snapshot API (Redis)
3. Print route page
4. PdfExportService (worker or inline for ≤500)
5. Extend export endpoint format=pdf
6. Export dropdown: Excel | PDF | چاپ
7. Audit + permissions reuse
8. Integration test PDF magic bytes `%PDF`
9. Visual QA RTL header/footer

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| PDF rows > 500 | 403 `PDF_ROW_LIMIT` | Suggest Excel |
| Expired print token | 410 `PRINT_TOKEN_EXPIRED` | Regenerate |
| Missing logo | — | Tenant name text only |
| Puppeteer fail | 500 | Toast + retry |
| Print cancelled | — | No side effect |

---

## تست

- [ ] Integration: PDF export returns valid PDF
- [ ] Integration: snapshot token single-use optional
- [ ] Component: PrintLayout renders header/footer
- [ ] E2E: print route opens without admin chrome
- [ ] RBAC: deny without export permission

---

## UX

- [ ] Export dropdown: «Excel»، «PDF»، «چاپ»
- [ ] Print preview in new tab before dialog
- [ ] Loading state per format
- [ ] Excellence §6.4 export ✅

---

## Flow

```
PDF: Click → POST format pdf → download .pdf
Print: Click → POST snapshot → open /print/customers?token= → window.print()
```

---

## Policy Alignment

- [ ] ADR-007 — money in print table
- [ ] ADR-004 — export permission
- [ ] Audit on PDF export
- [ ] No PII in print URL — token only

---

## مراجع

- `IFP-TASK-025-excel-export-streaming.md`
- `IFP-TASK-030-i18n-date-picker-jalali.md`
- `docs/01-product/installment-module-features.md` — PDF، چاپ

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 24 | PDF async optional documented |
| Policy | /25 | 24 | |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **98** | ≥95 ✅ |
