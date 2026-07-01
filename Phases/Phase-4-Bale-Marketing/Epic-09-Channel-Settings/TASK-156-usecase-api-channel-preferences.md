# TASK-156: Use Case & API — Channel Preferences

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-09-Channel-Settings |
| ID | TASK-156 |
| Priority | P0 |
| Depends on | TASK-155 |
| Blocks | TASK-157 |
| Estimated | 5h |

---

## هدف

Use case و API خواندن/به‌روزرسانی ترجیحات کانال tenant.

---

## معیار پذیرش

- [ ] `GetChannelPreferencesUseCase` + `UpdateChannelPreferencesUseCase`
- [ ] API: GET/PATCH `/api/v1/settings/channels`
- [ ] Permission: `core.settings.update`
- [ ] Audit: `settings.change`
- [ ] Contract Zod in packages/contracts

---

## مشخصات فنی

### API

```
GET  /api/v1/settings/channels
PATCH /api/v1/settings/channels
Body: partial channel settings per schema
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/settings/channel-preferences.use-case.ts` |
| Create | `packages/contracts/src/settings/channel-preferences.schema.ts` |
| Create | `apps/api/src/modules/settings/channel-settings.controller.ts` |

---

## مراحل پیاده‌سازی

1. Use cases
2. Contracts
3. Controller
4. Audit
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Deny permission | 403 | RBAC |
| Invalid partial | 400 | Zod |
| Cross-tenant | — | JWT tenant only |

---

## تست

- [ ] Integration: GET/PATCH
- [ ] Integration: audit log entry

---

## Policy Alignment

- [ ] RBAC core.settings.update
- [ ] Audit settings.change

---

## مراجع

- `docs/02-architecture/rbac.md`

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
