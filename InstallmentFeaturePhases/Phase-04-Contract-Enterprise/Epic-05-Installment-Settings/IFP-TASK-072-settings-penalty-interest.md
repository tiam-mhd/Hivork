# IFP-TASK-072: Settings Schema — Penalty, Interest & Calculation Formula

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-05-Installment-Settings |
| ID | IFP-TASK-072 |
| Priority | P0 |
| Depends on | Phase 1 TASK-070, TASK-048 |
| Blocks | IFP-073, IFP-074, IFP-075 |
| Estimated | 6h |

---

## هدف

گسترش `InstallmentsSettingsSchema` با keys §۱۵: **فرمول محاسبه**، **جریمه دیرکرد**، **سود** — در contracts + modules settings schema.

---

## معیار پذیرش

- [ ] New keys added to `installmentsSettingsSchema` (modules) و Zod mirror (contracts)
- [ ] `calculation_formula` enum: `EQUAL_INSTALLMENTS`, `DECLINING_BALANCE`, `CUSTOM` (CUSTOM reserved — Phase 05)
- [ ] `penalty_type` enum: `NONE`, `FIXED_DAILY`, `PERCENT_DAILY`, `PERCENT_MONTHLY`
- [ ] `penalty_rate_bps` int 0–10000 (when percent types)
- [ ] `penalty_fixed_rial` bigint string (when FIXED_DAILY)
- [ ] `penalty_grace_days` int 0–30 default 0
- [ ] `interest_rate_bps_annual` int 0–10000 default 0
- [ ] `interest_calculation_method` enum: `SIMPLE`, `NONE`
- [ ] Defaults documented; partial PATCH compatible
- [ ] Unit tests per key validation

---

## مشخصات فنی

```typescript
export const InstallmentsSettingsEnterpriseSchema = InstallmentsSettingsSchema.extend({
  calculation_formula: z.enum(['equal_installments', 'declining_balance', 'custom']).default('equal_installments'),
  penalty_type: z.enum(['none', 'fixed_daily', 'percent_daily', 'percent_monthly']).default('none'),
  penalty_rate_bps: z.number().int().min(0).max(10000).default(0),
  penalty_fixed_rial: bigintRialNonNegativeSchema.default('0'),
  penalty_grace_days: z.number().int().min(0).max(30).default(0),
  interest_rate_bps_annual: z.number().int().min(0).max(10000).default(0),
  interest_calculation_method: z.enum(['simple', 'none']).default('none'),
}).superRefine((v, ctx) => {
  if (v.penalty_type === 'fixed_daily' && BigInt(v.penalty_fixed_rial) === 0n) {
    ctx.addIssue({ code: 'custom', message: 'PENALTY_FIXED_REQUIRED', path: ['penalty_fixed_rial'] });
  }
  if (v.penalty_type.startsWith('percent') && v.penalty_rate_bps === 0) {
    ctx.addIssue({ code: 'custom', message: 'PENALTY_RATE_REQUIRED', path: ['penalty_rate_bps'] });
  }
});
```

### Settings keys table

| Key | Type | Default | §۱۵ |
|-----|------|---------|-----|
| calculation_formula | enum | equal_installments | فرمول محاسبه |
| penalty_type | enum | none | جریمه |
| penalty_rate_bps | int | 0 | جریمه |
| penalty_fixed_rial | bigint str | 0 | جریمه |
| penalty_grace_days | int | 0 | جریمه |
| interest_rate_bps_annual | int | 0 | سود |
| interest_calculation_method | enum | none | سود |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/modules/installments/src/settings.schema.ts` |
| Update | `packages/contracts/src/installments/settings.schema.ts` |
| Update | `packages/contracts/src/installments/settings.schema.spec.ts` |
| Update | `docs/02-architecture/settings.md` |

---

## مراحل پیاده‌سازی

1. Add keys to module settings schema with defaults
2. Mirror in contracts Zod
3. superRefine cross-field validation
4. Unit tests
5. Document in settings.md — algorithm consumption in IFP Phase 05

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| percent penalty with 0 bps | `PENALTY_RATE_REQUIRED` |
| penalty_rate_bps > 10000 | validation |
| custom formula selected | allowed — implementation Phase 05 |

---

## تست

- [ ] Unit: defaults parse
- [ ] Unit: percent_daily requires rate
- [ ] Unit: fixed_daily requires amount
- [ ] Unit: partial PATCH single key

---

## UX

IFP-077 settings section — penalty/interest form groups.

---

## Flow

Settings admin → installments tab → penalty section.

---

## Policy Alignment

- [ ] Schema keys only — no free-form
- [ ] Sync module + contracts 100%

---

## مراجع

- `docs/01-product/installment-module-features.md` §۱۵
- Phase 1 `TASK-070-contracts-installments-settings.md`

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
