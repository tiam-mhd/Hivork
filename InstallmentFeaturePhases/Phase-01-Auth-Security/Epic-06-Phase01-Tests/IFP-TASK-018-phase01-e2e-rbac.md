# IFP-TASK-018: Phase 01 Vertical Slice E2E + RBAC Tests

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-06-Phase01-Tests |
| ID | IFP-018 |
| Priority | P0 |
| Depends on | IFP-001, IFP-002, IFP-003, IFP-004, IFP-005, IFP-006, IFP-008, IFP-009, IFP-010, IFP-011, IFP-012, IFP-013, IFP-015, IFP-017 |
| Blocks | Phase 02 IFP-019 |
| Estimated | 12h |

---

## هدف

تست **vertical slice** کامل Phase 01: ورود password + MFA، forgot password، session management، security settings — به‌علاوه **RBAC deny/allow** برای endpointهای امنیتی. این task gate خروج فاز است.

---

## معیار پذیرش

- [ ] Integration test suite `phase-01-auth.integration.spec.ts` — API (Testcontainers)
- [ ] Playwright suite `phase-01-auth.e2e.spec.ts` — web critical paths
- [ ] RBAC tests: session list, api-key (IFP-016), settings.security
- [ ] Cross-tenant fail tests برای session + api key
- [ ] CI job `test:phase-01-auth` در pipeline
- [ ] Coverage: همه P0 acceptance criteria از IFP-001→017 traceable
- [ ] Document test data seed `prisma/seed/phase-01-auth.ts`
- [ ] All tests pass — flake rate < 2%

---

## مشخصات فنی

### Test Infrastructure

```
packages/integration-tests/
├── src/phase-01-auth/
│   ├── phase-01-auth.integration.spec.ts
│   ├── fixtures/auth-users.ts
│   └── helpers/captcha-bypass.ts
apps/web/e2e/
└── phase-01-auth.e2e.spec.ts
```

### Integration Scenarios (API)

| # | Scenario | Tasks covered |
|---|----------|---------------|
| 1 | Register → set initial password → password login | IFP-001, 002 |
| 2 | Password login → MFA OTP step-up → session | IFP-004 |
| 3 | TOTP setup → login with TOTP | IFP-005 |
| 4 | Forgot password full flow | IFP-006 |
| 5 | Login creates StaffSession | IFP-008 |
| 6 | List + revoke session | IFP-009 |
| 7 | Last login previous in response | IFP-010 |
| 8 | Remember Me TTL difference | IFP-011 |
| 9 | Captcha bypass in test | IFP-012 |
| 10 | Lockout after 5 fails | IFP-013 |
| 11 | Change password in settings | IFP-015 |
| 12 | Refresh token rotation + reuse detection | IFP-011 |

### RBAC Scenarios

| # | Endpoint | Role | Expected |
|---|----------|------|----------|
| R1 | GET /staff/me/sessions | staff (default) | 200 |
| R2 | GET /staff/me/sessions | no auth | 401 |
| R3 | DELETE /staff/me/sessions/:id | other tenant token | 404 |
| R4 | PATCH /settings/security (IP) | staff without settings.edit | 403 |
| R5 | POST /settings/api-keys | without apikey.create | 403 |
| R6 | POST /settings/api-keys | tenant owner | 201 |

### E2E Scenarios (Playwright)

| # | Flow |
|---|------|
| E1 | Login password tab → dashboard |
| E2 | Login → MFA page → OTP (mock SMS) → dashboard |
| E3 | Forgot password → reset → login |
| E4 | Settings → change password |
| E5 | Settings → sessions → revoke → re-login required |
| E6 | mustChangePassword forced flow |

### Test Helpers

```typescript
// captcha-bypass.ts
export const CAPTCHA_BYPASS_HEADERS = {
  'X-Captcha-Bypass': process.env.CAPTCHA_BYPASS_TOKEN ?? 'test-bypass',
};

// auth-users.ts — demo tenant staff with credential
export async function seedPhase01AuthFixture(prisma): Promise<Phase01Fixtures>;
```

### CI Configuration

```yaml
# .github/workflows/ci.yml (add job)
test-phase-01-auth:
  runs-on: ubuntu-latest
  services:
    postgres: ...
    redis: ...
  steps:
    - run: pnpm test:integration -- phase-01-auth
    - run: pnpm test:e2e -- phase-01-auth
```

### Assertions — Financial N/A

Auth phase — focus IDOR, tenant isolation, token security.

### Cleanup

```typescript
afterEach(async () => {
  // Soft delete test api keys — never prisma.delete
  await softDeleteTestEntities(prisma, tenantId);
  await redis.flushdb(); // ephemeral OK per SOFT-DELETE policy
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/integration-tests/src/phase-01-auth/phase-01-auth.integration.spec.ts` |
| Create | `packages/integration-tests/src/phase-01-auth/fixtures/auth-users.ts` |
| Create | `apps/web/e2e/phase-01-auth.e2e.spec.ts` |
| Create | `prisma/seed/phase-01-auth.ts` |
| Update | `package.json` — script `test:phase-01-auth` |
| Update | `.github/workflows/ci.yml` |
| Create | `docs/06-operations/testing-observability.md` — Phase 01 section |

---

## مراحل پیاده‌سازی

1. Fixture seed script
2. Integration tests 1–12 incremental
3. RBAC tests R1–R6
4. Playwright E2E E1–E6
5. CI job
6. Traceability matrix update in TRACEABILITY-MATRIX.md
7. Fix flakes — proper waits

---

## Edge Cases & Errors

| سناریو | Test assertion |
|--------|----------------|
| Concurrent login same user | both sessions listed |
| Expired mfaToken | 401 |
| Cross-tenant session revoke | 404 not 403 (IDOR) |
| OTP rate limit | 429 after threshold |
| Token reuse | all sessions revoked |

---

## تست

- [ ] Meta: this task IS the test task
- [ ] All scenarios green locally + CI
- [ ] Runtime < 10 min integration, < 15 min e2e

---

## UX

N/A — infrastructure task. E2E validates UX paths.

---

## Flow

```
CI push → test:phase-01-auth
  → integration 12 scenarios
  → rbac 6 scenarios
  → e2e 6 scenarios
  → pass → Phase 01 exit criteria met
```

---

## Policy Alignment

- [ ] DEVELOPMENT_RULES § testing — integration with Testcontainers
- [ ] SOFT-DELETE — no hard delete in cleanup
- [ ] Cross-tenant must fail
- [ ] No secrets in test files — env only

---

## مراجع

- [testing-observability.md](../../../docs/06-operations/testing-observability.md)
- [06-testing-quality.mdc](../../../.cursor/rules/06-testing-quality.mdc)
- Phase 01 all IFP-TASK-001→017

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 25 |
| Executability | /25 | 25 |
| Alignment | /15 | 15 |
| **جمع** | **/100** | **100** |

---

## Traceability Matrix (§1 + §20)

| Product bullet | Test ID |
|----------------|---------|
| ورود با رمز | E1, #1 |
| ورود دو مرحله‌ای OTP | E2, #2 |
| 2FA TOTP | #3 |
| فراموشی رمز | E3, #4 |
| نمایش آخرین ورود | #7 |
| تشخیص دستگاه | #5, E5 |
| Captcha | #9 |
| محدودیت دفعات ورود | #10 |
| Remember Me | #8 |
| خروج همه دستگاه‌ها | E5, #6 |
| تغییر رمز | E4, #11 |
| 2FA settings | #3 |
| دستگاه‌های فعال | E5 |
| نشست‌ها | #6 |
| کلید API | R5, R6 |
| IP مجاز | R4 |
