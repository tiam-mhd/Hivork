# IFP-TASK-075: Use Case + API — Enterprise Installment Settings

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-05-Installment-Settings |
| ID | IFP-TASK-075 |
| Priority | P0 |
| Depends on | IFP-TASK-072, IFP-TASK-073, IFP-TASK-074, Phase 1 TASK-078, TASK-079 |
| Blocks | IFP-077, IFP-078 |
| Estimated | 6h |

---

## هدف

گسترش **GetInstallmentSettings** و **UpdateInstallmentSettings** use cases + API برای keys Enterprise §۱۵ — merge defaults، audit، read-only sequence in response.

---

## معیار پذیرش

- [ ] Extend `GetInstallmentSettingsUseCase` — all Phase 1 + Enterprise keys in response
- [ ] Extend `UpdateInstallmentSettingsUseCase` — partial PATCH enterprise keys only
- [ ] `contract_number_next_sequence` returned read-only in GET; not in PATCH body
- [ ] Permission: `core.settings.view` / `core.settings.edit`
- [ ] Audit: `settings.change` with diff old/new for changed keys
- [ ] Zod parse after merge — `InstallmentsSettingsEnterpriseSchema`
- [ ] Controller unchanged paths: `GET/PATCH /api/v1/settings/installments`
- [ ] Integration tests for new keys

---

## مشخصات فنی

### GET response (extended excerpt)

```json
{
  "data": {
    "installments": {
      "reminder_days_before": [3, 1],
      "calculation_formula": "equal_installments",
      "penalty_type": "percent_daily",
      "penalty_rate_bps": 50,
      "penalty_grace_days": 3,
      "interest_rate_bps_annual": 1800,
      "interest_calculation_method": "simple",
      "rounding_mode": "nearest",
      "rounding_unit_rial": "1000",
      "skip_holidays_in_schedule": true,
      "holiday_calendar_source": "merge_official_and_custom",
      "custom_holiday_dates": ["1404-01-01"],
      "calendar_display_mode": "jalali",
      "calendar_input_mode": "jalali",
      "contract_numbering_enabled": true,
      "contract_number_prefix": "CTR",
      "contract_number_pad_length": 6,
      "contract_number_include_year": true,
      "contract_number_next_sequence": 43
    }
  }
}
```

### Update logic

```typescript
const PATCHABLE_KEYS = InstallmentsSettingsEnterpriseSchema.keyof().options
  .filter((k) => k !== 'contract_number_next_sequence');

// Strip unknown + readonly keys
// Merge → parse → persist module installments
// Audit diff
```

### Validation side effects

Changing `penalty_type` to `none` zeroes penalty_rate_bps in stored merge (optional normalize).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/installments/get-installment-settings.use-case.ts` |
| Update | `packages/application/installments/update-installment-settings.use-case.ts` |
| Update | `apps/api/src/modules/installments/settings.controller.ts` |
| Update | `docs/02-architecture/api-contracts.md` § settings |
| Create | Integration test `installment-settings-enterprise.spec.ts` |

---

## مراحل پیاده‌سازی

1. Merge enterprise schema into module settings defaults
2. Update get use case merge + parse
3. Update patch use case — readonly key guard
4. Extend audit diff builder
5. Integration tests
6. Update api-contracts.md examples

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| PATCH next_sequence | 400 | `READONLY_SETTING_KEY` |
| Invalid penalty combo | 400 | Zod `PENALTY_RATE_REQUIRED` |
| Unknown key | 400 | strict strip / reject |
| No edit permission | 403 | `PERMISSION_DENIED` |

---

## تست

- [ ] Integration: GET returns all enterprise defaults
- [ ] Integration: PATCH penalty settings
- [ ] Integration: PATCH next_sequence rejected
- [ ] Integration: audit log on change
- [ ] RBAC deny edit

---

## UX

IFP-077 — full installments settings page sections §۱۵.

---

## Flow

```
settings → اقساط → enterprise sections
save → PATCH partial → toast success
validation errors → field-level Persian messages
```

---

## Policy Alignment

- [ ] Settings schema keys only
- [ ] Audit `settings.change`
- [ ] tenantId from JWT

---

## مراجع

- IFP-TASK-072–074
- Phase 1 `TASK-078`, `TASK-079`, `TASK-082`
- `docs/02-architecture/settings.md`

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
