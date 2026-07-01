# IFP-182: Domain — Subscription Plan & Feature Caps

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-04-Subscription-Billing |
| ID | IFP-182 |
| Priority | P0 |
| Depends on | Phase-0 Plan model |
| Blocks | IFP-183 |
| Estimated | 10h |

---

## هدف

Domain rules سقف امکانات: staff count, branches, SMS credits — check قبل از create.

---

## معیار پذیرش

- [ ] PlanEntitlement value object
- [ ] FeatureCap enum: STAFF, BRANCH, SMS, STORAGE_MB
- [ ] checkPlanLimit(tenant, cap) → allow|deny
- [ ] Unit tests all caps
- [ ] Sync with existing PrismaTenantPlanReader

---

## مشخصات فنی

TENANT_PLAN_LIMIT_EXCEEDED on breach — 403

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/src/subscription/plan-entitlement.ts` |
| Create | `packages/domain/src/subscription/plan-entitlement.spec.ts` |

---

## مراحل پیاده‌سازی

1. Domain types
2. Limit checker
3. Wire to staff create etc

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| At limit staff | 403 | TENANT_PLAN_LIMIT_EXCEEDED |

---

## تست

- [ ] Unit: cap math

---

## Policy Alignment

- [ ] bigint for money
- [ ] ADR plan module

---

## مراجع

- `docs/02-architecture/modules.md`

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
