# TASK-165: Post-Register Redirect

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-12-Tenant-Self-Register |
| ID | TASK-165 |
| Priority | P0 |
| Depends on | TASK-164 |
| Blocks | TASK-174 |
| Estimated | 3h |

---

## هدف

بعد از ثبت‌نام موفق — redirect به onboarding dashboard پنل.

---

## معیار پذیرش

- [ ] Redirect `/admin` or onboarding wizard per TASK-055
- [ ] Cookie `hivork_staff` set
- [ ] Flash welcome toast
- [ ] Clear marketing form state
- [ ] Handle already-authenticated visit to /register

---

## مشخصات فنی

### Redirect logic

```typescript
onSuccess: () => router.push('/admin?welcome=1');
```

### Already logged in

`/register` → redirect to `/admin`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `apps/web/src/features/marketing/register/register-flow.tsx` |
| Create | `apps/web/src/features/marketing/register/post-register.ts` |

---

## مراحل پیاده‌سازی

1. Redirect handler
2. Welcome query param toast
3. Auth guard on /register
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Session missing after verify | — | error + support message |
| Deep link returnUrl | — | honor safe relative paths only |

---

## تست

- [ ] Unit: redirect path
- [ ] Component: authenticated guard

---

## Policy Alignment

- [ ] Separate cookies hivork_staff
- [ ] Security — open redirect prevented

---

## مراجع

- `docs/06-operations/security-and-audit.md`

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
