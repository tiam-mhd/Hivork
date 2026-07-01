# Epic-03 — Export & Print

> **Phase:** 02 — Cross-Cutting UI  
> **Priority:** P0  
> **ADR:** ADR-007 (money in export), ADR-013, ADR-015 (tenant + branch scope)

---

## هدف Epic

سرویس **خروجی Excel** (streaming، tenant-scoped) و **خروجی PDF + چاپ** با layout system یکسان برای گزارش‌ها و لیست‌ها. Export همیشه همان filter/sort فعلی UI را اعمال می‌کند — بدون export کل دیتابیس.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-TASK-025 | [IFP-TASK-025-excel-export-streaming.md](./IFP-TASK-025-excel-export-streaming.md) | Excel export service (streaming, tenant scope) | IFP-TASK-019, IFP-TASK-023 | P0 |
| IFP-TASK-026 | [IFP-TASK-026-pdf-export-print-layout.md](./IFP-TASK-026-pdf-export-print-layout.md) | PDF export + print layout system | IFP-TASK-025 | P0 |

---

## Dependency داخلی Epic

```
IFP-TASK-023 (list query pattern)
    └──► IFP-TASK-025 (Excel streaming)
              └──► IFP-TASK-026 (PDF + print)
```

---

## Policy notes

- Export endpoint: permission جدا — `{module}.{resource}.export`
- Audit log: `export.requested` با `{ resource, filterHash, rowCount }`
- Max rows per export: plan limit + hard cap (مثلاً 50_000)
- PII masking در export اختیاری per column config
- **بدون** offset pagination در export — cursor batch در backend
- Money columns: ریال bigint در فایل؛ header «مبلغ (تومان)» با conversion documented

---

## Blocks

- Dashboard/reports export در Phase 07
- Customer/contract list export در Phase 03–04
