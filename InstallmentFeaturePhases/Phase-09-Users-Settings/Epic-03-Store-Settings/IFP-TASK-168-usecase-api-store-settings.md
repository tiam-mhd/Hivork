# IFP-168: Use Case + API — Store Settings

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-03-Store-Settings |
| ID | IFP-168 |
| Priority | P0 |
| Depends on | IFP-166, IFP-167, IFP-169 |
| Blocks | IFP-170, IFP-171 |
| Estimated | 10h |

---

## هدف

Get/Update تنظیمات فروشگاه tenant — audit settings.change، permission core.settings.*.

---

## معیار پذیرش

- [ ] GetStoreSettingsUseCase — merge schema defaults
- [ ] UpdateStoreSettingsUseCase — partial patch validated
- [ ] GET/PATCH `/api/v1/settings/store`
- [ ] Audit `settings.change` with old/new diff (no secrets)
- [ ] Permissions: core.settings.view, core.settings.edit
- [ ] Contracts aligned

---

## مشخصات فنی

### PATCH
```json
PATCH /api/v1/settings/store
{ "displayName": "...", "tax": { "enabled": true, "ratePercent": 900 } }
```

Secrets: gateway apiKey never returned — masked placeholder

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/settings/get-store-settings.use-case.ts` |
| Create | `packages/application/src/settings/update-store-settings.use-case.ts` |
| Create | `apps/api/src/modules/core/store-settings.controller.ts` |

---

## مراحل پیاده‌سازی

1. Use cases
2. Controller
3. Audit diff redaction
4. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Partial invalid nested | 400 | VALIDATION_ERROR field path |
| Suspended tenant | 403 | TENANT_SUSPENDED |

---

## تست

- [ ] Integration: patch + audit
- [ ] RBAC deny edit

---

## Policy Alignment

- [ ] Audit settings.change
- [ ] ADR-005

---

## مراجع

- `Phases/Phase-0 settings tasks`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
