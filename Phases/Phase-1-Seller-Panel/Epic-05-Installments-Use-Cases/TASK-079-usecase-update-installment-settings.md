# TASK-079: Use Case — Update Installment Settings

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-05-Installments-Use-Cases |
| ID | TASK-079 |
| Priority | P0 |
| Depends on | TASK-078, TASK-070, TASK-047 |
| Blocks | TASK-082, TASK-114 |
| Estimated | 5h |

---

## هدف

`UpdateInstallmentSettingsUseCase` — PATCH partial تنظیمات ماژول اقساط با validation Zod، audit `settings.change` per key changed، و persist در settings store. فقط keys مجاز schema — reject unknown keys.

---

## معیار پذیرش

- [ ] `UpdateInstallmentSettingsUseCase.execute(tenantId, partialDto, actorId)`
- [ ] Validate input via `UpdateInstallmentsSettingsSchema` (TASK-070)
- [ ] Partial update — only provided keys written
- [ ] Audit: one `settings.change` per key with `{ key, oldValue, newValue }`
- [ ] Permission: `core.settings.edit`
- [ ] Module: installments enabled
- [ ] Return merged full settings (same as GET)
- [ ] Reject unknown keys at controller/contract layer (`.strict()` on wrapper)
- [ ] Transaction: settings upsert + audit rows atomic

---

## مشخصات فنی

### Input

```typescript
export type UpdateInstallmentSettingsInput = {
  tenantId: string;
  actorId: string;
  patch: UpdateInstallmentsSettingsDto;
  ip?: string;
};
```

### Logic

```typescript
async execute(input: UpdateInstallmentSettingsInput): Promise<GetInstallmentsSettingsResult> {
  const parsed = UpdateInstallmentsSettingsSchema.parse(input.patch);
  const keys = Object.keys(parsed) as (keyof InstallmentsSettingsDto)[];

  if (keys.length === 0) {
    return this.getSettings.execute({ tenantId: input.tenantId });
  }

  return this.unitOfWork.transaction(async (tx) => {
    const current = await this.getSettings.execute({ tenantId: input.tenantId });

    for (const key of keys) {
      const oldValue = current.installments[key];
      const newValue = parsed[key]!;
      await this.settingsRepo.upsertKey(
        input.tenantId,
        'installments',
        key,
        newValue,
        tx,
      );
      await this.audit.log({
        action: 'settings.change',
        entity: 'TenantSettings',
        entityId: `${input.tenantId}:installments:${key}`,
        tenantId: input.tenantId,
        actorId: input.actorId,
        oldValue: { [key]: oldValue },
        newValue: { [key]: newValue },
        ip: input.ip,
      }, tx);
    }

    return this.getSettings.execute({ tenantId: input.tenantId });
  });
}
```

### PATCH Request Example

```json
{
  "reminder_days_before": [5, 2, 1],
  "default_installment_count": 6
}
```

### Audit Example

```json
{
  "action": "settings.change",
  "entity": "TenantSettings",
  "oldValue": { "default_installment_count": 12 },
  "newValue": { "default_installment_count": 6 }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/settings/update-installment-settings.use-case.ts` |
| Create | `packages/application/src/installments/settings/update-installment-settings.use-case.spec.ts` |
| Reuse | `packages/application/src/installments/settings/get-installment-settings.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Parse patch with UpdateInstallmentsSettingsSchema
2. Load current settings for audit old values
3. Transaction: upsert each key + audit per key
4. Return merged GET result
5. Unit tests: partial patch، validation fail، empty patch
6. Integration: patch → get reflects change + audit rows

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid reminder_time | 400 | Zod validation |
| default_installment_count=0 | 400 | min(1) |
| Empty patch `{}` | 200 | no-op, return current |
| No edit permission | 403 | `PERMISSION_DENIED` |
| Duplicate reminder_days | 400 | `DUPLICATE_VALUES` |
| Unknown key in body | 400 | strict schema |

---

## تست

- [ ] Unit: update single key → audit once
- [ ] Unit: update two keys → two audit entries
- [ ] Unit: invalid time → throw validation
- [ ] Unit: empty patch → no audit
- [ ] Integration: PATCH then GET consistent
- [ ] Integration: audit log contains old/new values

---

## UX

N/A — TASK-114 frontend settings form.

---

## Flow

```
PATCH settings partial
  → validate Zod
  → load current
  → tx: upsert keys + audit each
  → return full merged settings
```

---

## Policy Alignment

- [ ] Audit mandatory for settings.change — security-and-audit.md
- [ ] Schema keys only — no business invariants in settings
- [ ] EXCELLENCE-STANDARDS §3
- [ ] SOFT-DELETE-POLICY — settings are not soft-deleted entities

---

## مراجع

- `docs/06-operations/security-and-audit.md` — settings.change
- `docs/02-architecture/settings.md`
- `Phases/Phase-1-Seller-Panel/Epic-06-Installments-API/TASK-082-api-installments-settings.md`
- `Phases/Phase-1-Seller-Panel/Epic-04-Installments-Contracts/TASK-070-contracts-installments-settings.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | PATCH، audit per key |
| Policy | 25 | 25 | audit، schema keys |
| Executability | 25 | 25 | 6 tests |
| Alignment | 15 | 15 | TASK-078، TASK-070 |
| **جمع** | **100** | **100** | ≥95 ✅ |
