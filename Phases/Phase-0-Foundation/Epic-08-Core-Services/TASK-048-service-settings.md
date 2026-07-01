# TASK-048: Service — Settings (Schema-Based)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-08-Core-Services |
| ID | TASK-048 |
| Priority | P0 |
| Depends on | TASK-025 (TenantSetting Prisma schema), TASK-016 (modules structure) |
| Blocks | TASK-054 |
| Estimated | 6h |

---

## هدف

سرویس تنظیمات schema-based برای tenant — تنها keys مجاز آنهایی هستند که در schema تعریف شده‌اند (نه free-form). هر ماژول schema خود را register می‌کند. Branch می‌تواند مقادیر tenant را override کند (آینده). Audit log برای هر تغییر اجباری است.

---

## معیار پذیرش

- [ ] `ISettingsSchemaRegistry` port با `getSchema(module)` و `hasModule(module)`
- [ ] `SettingFieldDef` پشتیبانی از انواع: `enum`, `boolean`, `number`, `bigint-string`, `enum-array`
- [ ] `GetSettingsUseCase` — دریافت همه settings یک module با default fallback
- [ ] `UpdateSettingUseCase` — validate با Zod → upsert → audit `settings.change`
- [ ] `SettingsSchemaRegistry` در infrastructure با schemas: `core`, `reminders`, `installments`
- [ ] Schema keys موجود:
  - `core`: `timezone` (enum), `display_currency` (enum)
  - `reminders`: `enabled` (boolean), `daysBefore` (number, 1–30), `channels` (enum-array)
  - `installments`: `defaultGraceDays` (number, 0–30), `lateFeePercent` (bigint-string, 0–10000)
- [ ] key نامعتبر → 400 `INVALID_SETTING_KEY`
- [ ] value نامعتبر → 400 `INVALID_SETTING_VALUE`
- [ ] module نامعتبر → 400 `UNKNOWN_SETTINGS_MODULE`
- [ ] Unit tests برای هر حالت خطا

---

## مشخصات فنی

### SettingFieldDef Types

```typescript
// packages/application/src/ports/settings-schema-registry.port.ts
export type EnumSettingDef       = { type: 'enum'; values: readonly string[]; default: string; };
export type BooleanSettingDef    = { type: 'boolean'; default: boolean; };
export type NumberSettingDef     = { type: 'number'; min?: number; max?: number; default: number; };
export type BigintStringSettingDef = { type: 'bigint-string'; min?: string; max?: string; default: string; };
export type EnumArraySettingDef  = { type: 'enum-array'; values: readonly string[]; default: string[]; };

export type SettingFieldDef =
  | EnumSettingDef | BooleanSettingDef | NumberSettingDef
  | BigintStringSettingDef | EnumArraySettingDef;

export type SettingsModuleSchema = Readonly<Record<string, SettingFieldDef>>;

export interface ISettingsSchemaRegistry {
  getSchema(module: string): SettingsModuleSchema | undefined;
  hasModule(module: string): boolean;
}
```

### Settings Schemas

```typescript
// modules/core/src/settings/core.settings.schema.ts
export const coreSettingsSchema = {
  timezone:         { type: 'enum', values: ['Asia/Tehran'], default: 'Asia/Tehran' },
  display_currency: { type: 'enum', values: ['toman', 'rial'], default: 'toman' },
} as const;

// modules/core/src/settings/reminders.settings.schema.ts
export const remindersSettingsSchema = {
  enabled:    { type: 'boolean', default: true },
  daysBefore: { type: 'number', min: 1, max: 30, default: 3 },
  channels:   { type: 'enum-array', values: ['sms', 'telegram', 'bale'], default: ['sms'] },
} as const;

// modules/core/src/settings/installments.settings.schema.ts
export const installmentsSettingsSchema = {
  defaultGraceDays: { type: 'number', min: 0, max: 30, default: 0 },
  // lateFeePercent stored as bigint-safe string: "150" = 1.50%
  lateFeePercent:   { type: 'bigint-string', min: '0', max: '10000', default: '0' },
} as const;
```

### API

```
GET  /api/v1/settings?module=core
PUT  /api/v1/settings/:module/:key   { value: ... }
```

هر دو endpoint نیاز به: `@RequireAuth('staff')` + `@RequirePermission('core.settings.view'|'core.settings.edit')`

### Use Case Pattern

```typescript
// GetSettingsUseCase: returns all keys with stored value or schema default
// UpdateSettingUseCase:
//   1. getSchema(module) → unknown module → throw ApplicationError('UNKNOWN_SETTINGS_MODULE', 400)
//   2. schema[key] → unknown key → throw ApplicationError('INVALID_SETTING_KEY', 400)
//   3. zodForSettingField(def).safeParse(value) → invalid → throw ApplicationError('INVALID_SETTING_VALUE', 400)
//   4. settingsRepository.upsert(...)
//   5. audit.log({ action: 'settings.change', ... })
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/src/ports/settings-schema-registry.port.ts` |
| Update | `packages/application/src/settings/build-setting-zod.ts` |
| Update | `packages/application/src/settings/get-setting.use-case.ts` |
| Update | `packages/application/src/settings/update-setting.use-case.ts` |
| Create | `modules/core/src/settings/reminders.settings.schema.ts` |
| Create | `modules/core/src/settings/installments.settings.schema.ts` |
| Update | `modules/core/src/index.ts` (export new schemas) |
| Update | `packages/infrastructure/src/settings/settings-schema.registry.ts` |
| Update | `packages/application/src/settings/settings.use-case.spec.ts` |

---

## مراحل پیاده‌سازی

1. افزودن `NumberSettingDef`, `BigintStringSettingDef`, `EnumArraySettingDef` به `SettingFieldDef`
2. به‌روزرسانی `build-setting-zod.ts` برای handle کردن نوع‌های جدید
3. ایجاد `reminders.settings.schema.ts` و `installments.settings.schema.ts`
4. Export از `modules/core/src/index.ts`
5. Register در `SettingsSchemaRegistry` (core, reminders, installments)
6. به‌روزرسانی unit tests برای cover کردن نوع‌های جدید

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| module نامعتبر | 400 | `UNKNOWN_SETTINGS_MODULE` |
| key نامعتبر | 400 | `INVALID_SETTING_KEY` |
| value type اشتباه | 400 | `INVALID_SETTING_VALUE` |
| `lateFeePercent` > 10000 | 400 | `INVALID_SETTING_VALUE` |
| `daysBefore` = 0 | 400 | `INVALID_SETTING_VALUE` |
| عدم دسترسی | 403 | `PERMISSION_DENIED` |

---

## تست

- [ ] Unit: `GetSettingsUseCase` — defaults وقتی stored خالی است
- [ ] Unit: `UpdateSettingUseCase` — invalid key → 400
- [ ] Unit: `UpdateSettingUseCase` — invalid value → 400
- [ ] Unit: `UpdateSettingUseCase` — valid → upsert + audit
- [ ] Unit: `bigint-string` validation — non-numeric → fail
- [ ] Unit: `bigint-string` validation — below min → fail
- [ ] Unit: `enum-array` validation — invalid member → fail

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 (use case completeness — validation + audit)
- [ ] SOFT-DELETE-POLICY: TenantSetting soft delete fields در schema (deletedAt در upsert restore)
- [ ] ADR-013: تغییر ماژول جدید → ADR قبل از implementation

---

## مراجع

- `docs/02-architecture/settings.md`
- `docs/09-development/EXCELLENCE-STANDARDS.md` §3
- `docs/09-development/ERROR-CODES.md` §6 (Settings errors)

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | Schema types, keys, API, Files, Steps |
| Policy | 25/25 | Audit، soft delete، ADR alignment |
| Executability | 25/25 | Code patterns، edge cases، تست‌های explicit |
| Alignment | 14/15 | sync با EXCELLENCE §3، ERROR-CODES |
| **جمع** | **99/100** | ≥95 ✅ |
