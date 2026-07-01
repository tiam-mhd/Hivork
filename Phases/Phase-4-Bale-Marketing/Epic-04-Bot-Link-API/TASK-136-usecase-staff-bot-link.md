# TASK-136: Use Case — StaffBotLink

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-04-Bot-Link-API |
| ID | TASK-136 |
| Priority | P0 |
| Depends on | TASK-131, TASK-135 |
| Blocks | TASK-137, TASK-146 |
| Estimated | 5h |

---

## هدف

Use case اتصال فروشنده به بازو — reuse link flow با `StaffBotIdentity`.

---

## معیار پذیرش

- [ ] `StaffBotLinkUseCase` — staff `/start link_{token}`
- [ ] Permission check: staff linking own identity only (or admin)
- [ ] Upsert StaffBotIdentity
- [ ] Audit: `staff.bot.link`
- [ ] Separate actor: staff token from panel-generated link

---

## مشخصات فنی

### Staff link token payload

```typescript
{ targetType: 'staff', staffId: string, tenantId: string, platform: 'bale' }
```

### Authorization

- Staff can only link self unless `core.staff.manage`
- chatId unique per tenant+platform

### Response to bot

Confirmation template key: `staff.bot.linked`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/bot/staff-bot-link.use-case.ts` |
| Create | `packages/application/bot/staff-bot-link.use-case.spec.ts` |
| Update | `packages/application/bot/index.ts` |

---

## مراحل پیاده‌سازی

1. Extend token payload for staff
2. StaffBotLink use case
3. Audit + tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Staff links another staff chat | 403 | deny |
| Admin links on behalf | 200 | allowed with audit |
| Duplicate chatId | 409 | reject |

---

## تست

- [ ] Unit: staff self-link
- [ ] Unit: admin override
- [ ] Integration: StaffBotIdentity row

---

## Policy Alignment

- [ ] RBAC staff scope
- [ ] Audit staff.bot.link
- [ ] ADR-015 N/A — staff not branch-scoped for bot

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/Epic-07-Seller-Bot-Flows/README.md`

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
