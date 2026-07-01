# IFP-TASK-106: Settings — فعال‌سازی روش‌های پرداخت

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-02-Payment-Methods-Unified |
| ID | IFP-TASK-106 |
| Priority | P1 |
| Depends on | IFP-TASK-104 |
| Blocks | IFP-TASK-117 |
| Estimated | 4h |

---

## هدف

تنظیمات tenant برای **فعال/غیرفعال** روش‌های پرداخت — ذخیره در `TenantSetting` module `installments` key `payment.methods` — با API GET/PATCH و audit `settings.change`.

---

## معیار پذیرش

- [ ] Settings schema key `payment.methods` در `settings.schema.ts`
- [ ] Default: cash, bank_transfer, in_person enabled; online/wallet per plan
- [ ] `GetPaymentMethodSettingsUseCase` + `UpdatePaymentMethodSettingsUseCase`
- [ ] API `GET /api/v1/settings/payment-methods`
- [ ] API `PATCH /api/v1/settings/payment-methods`
- [ ] Permission: `core.settings.read` / `core.settings.update`
- [ ] Audit: `settings.change`
- [ ] Cannot disable last enabled method if pending payments exist (warn only)

---

## مشخصات فنی

### Settings value shape

```typescript
// installments module key: payment.methods
type PaymentMethodsSetting = {
  methods: Array<{
    method: UnifiedPaymentMethod;
    enabled: boolean;
    displayOrder: number;
    labelFa?: string;
  }>;
};
```

### API

```
GET  /api/v1/settings/payment-methods
PATCH /api/v1/settings/payment-methods
Permission GET: core.settings.read
Permission PATCH: core.settings.update
```

### PATCH body

```json
{
  "methods": [
    { "method": "cash", "enabled": true, "displayOrder": 0 },
    { "method": "online", "enabled": true, "displayOrder": 1 }
  ]
}
```

### Validation

- At least one method must remain `enabled: true`
- `displayOrder` unique per tenant config
- Plan check: enabling `online` requires plan entitlement

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/domain/src/settings/settings.schema.ts` |
| Create | `packages/application/settings/payment-method-settings.use-case.ts` |
| Create | `packages/contracts/src/settings/payment-method-settings.schema.ts` |
| Create | `apps/api/src/modules/settings/payment-method-settings.controller.ts` |
| Create | `packages/application/settings/payment-method-settings.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Add settings schema key + defaults on tenant create seed
2. Use cases read/update TenantSetting
3. Contracts + controller
4. Audit on PATCH
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Disable all methods | 400 | `AT_LEAST_ONE_METHOD_REQUIRED` |
| Enable online without plan | 403 | `PLAN_ENTITLEMENT_REQUIRED` |
| Invalid method enum | 400 | Zod |

---

## تست

- [ ] Integration: GET defaults
- [ ] Integration: PATCH + audit
- [ ] Integration: disable all → 400

---

## UX

- [ ] Settings page section «روش‌های پرداخت» — toggle per method
- [ ] Drag reorder displayOrder
- [ ] Plan badge on pro methods
- [ ] Save loading + error states

---

## Flow

```
تنظیمات → پرداخت → toggle روش‌ها → ذخیره
→ IFP-105 respects enabled flags immediately
```

---

## Policy Alignment

- [ ] Settings schema only — no free-form
- [ ] Audit settings.change
- [ ] SOFT-DELETE on TenantSetting

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶
- IFP-TASK-104, IFP-TASK-105

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
