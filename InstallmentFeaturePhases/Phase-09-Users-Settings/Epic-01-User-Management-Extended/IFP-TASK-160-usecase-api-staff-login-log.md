# IFP-160: Use Case + API — Staff Login Log List

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-01-User-Management-Extended |
| ID | IFP-160 |
| Priority | P0 |
| Depends on | IFP-159, IFP-001 |
| Blocks | IFP-165, IFP-171 |
| Estimated | 8h |

---

## هدف

ثبت خودکار لاگ در auth flow و API لیست/فیلتر برای مدیر tenant — نمایش آخرین ورود و تاریخچه.

---

## معیار پذیرش

- [ ] RecordStaffLoginUseCase — called from auth on success/fail
- [ ] ListStaffLoginLogsUseCase — cursor pagination, filter staffId/result/date
- [ ] GET `/api/v1/staff-login-logs` + GET `/api/v1/staff/:id/login-logs`
- [ ] Permission: `core.staff_login_log.view`
- [ ] Update Staff.lastLoginAt on success (existing field)
- [ ] Contracts Zod response

---

## مشخصات فنی

### List API
```http
GET /api/v1/staff-login-logs?staffId=&result=failed&from=2026-01-01&to=&limit=50&cursor=
```

### Response item
```json
{ "id", "staffId", "staffName", "result", "ip", "userAgent", "createdAt" }
```

### Auth hook
Login success → RecordStaffLogin(result=success) + patch lastLoginAt

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/auth/record-staff-login.use-case.ts` |
| Create | `packages/application/src/staff/list-staff-login-logs.use-case.ts` |
| Create | `apps/api/src/modules/core/staff-login-logs.controller.ts` |

---

## مراحل پیاده‌سازی

1. Record use case
2. Wire into OTP/password verify
3. List API + data scope
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Cross-tenant staffId | 404 | STAFF_NOT_FOUND |
| Branch scope staff | 403 | FORBIDDEN — owner sees all |

---

## تست

- [ ] Integration: login creates log
- [ ] List filters
- [ ] RBAC deny

---

## Policy Alignment

- [ ] ADR-015 data scope
- [ ] No PII in application logs

---

## مراجع

- `docs/02-architecture/rbac.md`
- `IFP-159`

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
