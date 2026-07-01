# TASK-078: Use Case — Get Installment Settings

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-05-Installments-Use-Cases |
| ID | TASK-078 |
| Priority | P0 |
| Depends on | TASK-070, TASK-049, TASK-060 |
| Blocks | TASK-079, TASK-082, TASK-114 |
| Estimated | 3h |

---

## هدف

`GetInstallmentSettingsUseCase` — خواندن تنظیمات ماژول اقساط برای tenant از settings store (TASK-049) با merge defaults از schema. خروجی هم‌تراز `InstallmentsSettingsSchema` (TASK-070).

---

## معیار پذیرش

- [ ] `GetInstallmentSettingsUseCase.execute(tenantId)`
- [ ] Load keys from `tenant_settings` where module=`installments`
- [ ] Merge with defaults from `installmentsSettingsSchema`
- [ ] Return `{ installments: InstallmentsSettingsDto }`
- [ ] Permission: `core.settings.view` (controller)
- [ ] Module entitlement: installments enabled on tenant
- [ ] No tenantId from client — JWT only
- [ ] All 9 keys always present in response (defaults fill gaps)
- [ ] Type-safe parse through Zod before return

---

## مشخصات فنی

### Logic

```typescript
async execute(input: { tenantId: string }): Promise<GetInstallmentsSettingsResult> {
  await this.moduleGuard.assertEnabled(input.tenantId, 'installments');

  const stored = await this.settingsRepo.getByModule(input.tenantId, 'installments');
  const merged = InstallmentsSettingsSchema.parse({
    ...InstallmentsSettingsSchema.parse({}), // defaults
    ...stored,
  });

  return { installments: merged };
}
```

### Response

```json
{
  "data": {
    "installments": {
      "reminder_days_before": [3, 1],
      "reminder_on_due_date": true,
      "reminder_time": "09:00",
      "overdue_escalation_days": [1, 3, 7],
      "default_installment_count": 12,
      "allow_customer_self_report_payment": true,
      "require_seller_payment_confirmation": true,
      "notify_seller_on_customer_payment_report": true,
      "default_reminder_channels": ["telegram"]
    }
  }
}
```

### Settings Keys Source

| Key | Default | Schema file |
|-----|---------|-------------|
| reminder_days_before | [3,1] | modules/installments/settings.schema.ts |
| ... | ... | TASK-070 Zod mirror |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/settings/get-installment-settings.use-case.ts` |
| Create | `packages/application/src/installments/settings/get-installment-settings.use-case.spec.ts` |
| Reuse | `packages/application/src/settings/settings.repository.port.ts` (TASK-049) |

---

## مراحل پیاده‌سازی

1. Wire settings repository from TASK-049
2. Implement merge-with-defaults logic
3. Zod parse output for safety
4. Module guard check
5. Unit test: empty store → all defaults
6. Unit test: partial stored → merged

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Module not enabled | 403 | `MODULE_NOT_ENABLED` |
| No permission | 403 | `PERMISSION_DENIED` |
| Corrupt stored value | 500 or sanitize | log + fallback default per key |
| New tenant no settings | 200 | full defaults |

---

## تست

- [ ] Unit: empty settings → defaults
- [ ] Unit: partial override → merged
- [ ] Unit: invalid stored value → Zod catch
- [ ] Integration: update then get returns new values
- [ ] Integration: module disabled → 403

---

## UX

N/A — TASK-114 settings page loads via this UC.

---

## Flow

```
GET settings?module=installments
  → module guard
  → load stored keys
  → merge defaults
  → Zod parse
Exit: full settings object
```

---

## Policy Alignment

- [ ] Settings schema keys only — no free-form
- [ ] EXCELLENCE-STANDARDS §3
- [ ] tenantId from JWT context only

---

## مراجع

- `docs/02-architecture/settings.md`
- `docs/02-architecture/api-contracts.md` § GET settings
- `Phases/Phase-1-Seller-Panel/Epic-04-Installments-Contracts/TASK-070-contracts-installments-settings.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | merge logic، 9 keys |
| Policy | 25 | 25 | schema keys only |
| Executability | 25 | 25 | 5 tests |
| Alignment | 15 | 15 | TASK-070، TASK-082 |
| **جمع** | **100** | **100** | ≥95 ✅ |
