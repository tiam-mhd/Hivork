# IFP-TASK-074: Settings — Contract Numbering & Calendar Mode

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-05-Installment-Settings |
| ID | IFP-TASK-074 |
| Priority | P0 |
| Depends on | IFP-TASK-072 |
| Blocks | IFP-075, IFP-061 |
| Estimated | 6h |

---

## هدف

تنظیمات **روش شماره‌گذاری قرارداد** و **تقویم نمایش/ورودی** (شمسی/میلادی) — §۱۵ + پشتیبانی از `contractNumber` در IFP-055.

---

## معیار پذیرش

- [ ] `calendar_display_mode` enum: `JALALI`, `GREGORIAN`, `BOTH` default `JALALI`
- [ ] `calendar_input_mode` enum: `JALALI`, `GREGORIAN` default `JALALI`
- [ ] `contract_numbering_enabled` boolean default true
- [ ] `contract_number_prefix` string max 20 default `CTR`
- [ ] `contract_number_suffix` string max 20 optional
- [ ] `contract_number_pad_length` int 4–10 default 6
- [ ] `contract_number_include_year` boolean default true (Jalali year when display=JALALI)
- [ ] `contract_number_next_sequence` int — **server-managed**, not PATCHable by client
- [ ] `ContractNumberService.allocate(tenantId)` — atomic increment
- [ ] Zod: PATCH schema excludes `contract_number_next_sequence`
- [ ] Unit + integration test for concurrent allocation

---

## مشخصات فنی

### Number format examples

| Settings | Output |
|----------|--------|
| prefix=CTR, year=1404, pad=6, seq=42 | `CTR-1404-000042` |
| prefix=SH, no year, pad=4, seq=7 | `SH-0007` |

### ContractNumberService

```typescript
interface ContractNumberService {
  allocate(tenantId: string): Promise<string>;
  preview(settings: ContractNumberingSettings): string; // dry-run for UI
}
```

Implementation: `SELECT ... FOR UPDATE` on tenant settings row or dedicated `tenant_sequences` table.

### Settings schema excerpt

```typescript
export const ContractNumberingSettingsSchema = z.object({
  calendar_display_mode: z.enum(['jalali', 'gregorian', 'both']).default('jalali'),
  calendar_input_mode: z.enum(['jalali', 'gregorian']).default('jalali'),
  contract_numbering_enabled: z.boolean().default(true),
  contract_number_prefix: z.string().max(20).default('CTR'),
  contract_number_suffix: z.string().max(20).optional(),
  contract_number_pad_length: z.number().int().min(4).max(10).default(6),
  contract_number_include_year: z.boolean().default(true),
});
// contract_number_next_sequence: internal only — returned in GET for admin display read-only
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/modules/installments/src/settings.schema.ts` |
| Update | `packages/contracts/src/installments/settings.schema.ts` |
| Create | `packages/application/installments/contract-number.service.ts` |
| Create | `packages/infrastructure/persistence/tenant-sequence.repository.ts` |
| Update | `docs/02-architecture/settings.md` |

---

## مراحل پیاده‌سازی

1. Add calendar + numbering keys to settings schema
2. Implement sequence storage (migration if new table)
3. ContractNumberService with transaction
4. Wire to CreateSale (Phase 1) and CopyContract (IFP-061)
5. Integration test: 2 concurrent creates → unique numbers

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| Numbering disabled | contractNumber null allowed |
| Duplicate after crash retry | idempotent allocate with same saleId optional |
| PATCH next_sequence | 400 `READONLY_SETTING_KEY` |
| Prefix empty when enabled | validation min 1 char |

---

## تست

- [ ] Integration: allocate 100 sequential numbers
- [ ] Integration: concurrent 10 allocations — all unique
- [ ] Unit: preview format Jalali year
- [ ] Unit: PATCH rejects next_sequence

---

## UX

IFP-077 — numbering preview live; calendar mode toggles date pickers globally.

---

## Flow

```
create sale → auto contract number if enabled
settings → numbering preview «CTR-1404-000001»
```

---

## Policy Alignment

- [ ] Race-safe sequence — financial integrity
- [ ] Server-only sequence mutation
- [ ] ADR-016 settings GET/PATCH paths unchanged

---

## مراجع

- `docs/01-product/installment-module-features.md` §۱۵ — شمسی، میلادی، شماره‌گذاری
- IFP-TASK-055 `contractNumber` unique index
- IFP-TASK-061 copy contract

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
