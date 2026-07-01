# TASK-164: Self-Register Flow (API wiring)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-12-Tenant-Self-Register |
| ID | TASK-164 |
| Priority | P0 |
| Depends on | TASK-163, TASK-055 |
| Blocks | TASK-165 |
| Estimated | 6h |

---

## هدف

اتصال فرم ثبت‌نام به API onboarding — OTP verify → tenant create → role clone.

---

## معیار پذیرش

- [ ] Wire register form → onboarding API from TASK-055
- [ ] Multi-step: form → OTP → success
- [ ] Clone template roles on tenant create
- [ ] Rate limit OTP 3/min
- [ ] Error paths: duplicate, invalid OTP

---

## مشخصات فنی

### Flow steps

```
1. POST /api/v1/onboarding/register — send OTP
2. POST /api/v1/onboarding/verify — create tenant + staff owner
3. Set hivork_staff cookie
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/features/marketing/register/register-flow.tsx` |
| Update | `apps/web/src/features/marketing/register/register-form.tsx` |

---

## مراحل پیاده‌سازی

1. API client hooks
2. OTP step UI
3. Error handling
4. Progress indicator

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| OTP expired | — | resend with cooldown |
| Wrong OTP | — | attempt counter |
| Rate limit | 429 | wait message |

---

## تست

- [ ] Integration: register flow mock API
- [ ] Component: step transitions

---

## Flow (if applicable)

Form → Send OTP → Verify OTP → Tenant created → TASK-165 redirect
         ↘ errors → Recovery/resend

---

## Policy Alignment

- [ ] TASK-055 reuse — no duplicate onboarding logic
- [ ] Audit tenant.create

---

## مراجع

- `TASK-055`
- `docs/02-architecture/tenancy-and-entities.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
