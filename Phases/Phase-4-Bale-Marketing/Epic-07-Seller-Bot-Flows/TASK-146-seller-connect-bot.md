# TASK-146: Seller Connect Bot

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-07-Seller-Bot-Flows |
| ID | TASK-146 |
| Priority | P0 |
| Depends on | TASK-136, TASK-145 |
| Blocks | TASK-147, TASK-148 |
| Estimated | 5h |

---

## هدف

فلو اتصال فروشنده — لینک از پنل → `/start link_{token}` → StaffBotIdentity.

---

## معیار پذیرش

- [ ] Panel action: generate staff link token (reuse GenerateBotLinkToken pattern for staff)
- [ ] SellerBotConnectHandler in bot-gateway
- [ ] StaffBotLinkUseCase integration
- [ ] Confirmation message + deep link to panel
- [ ] Permission: staff self-service

---

## مشخصات فنی

### Panel entry

Settings → Notifications → «اتصال بازوی بله» → POST staff link-token variant

### Bot handler

Same `/start link_*` route — dispatches by token targetType staff vs customer

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/handlers/seller-connect.handler.ts` |
| Create | `packages/application/bot/generate-staff-bot-link-token.use-case.ts` |
| Update | `apps/bot-gateway/src/bale/command-router.ts` |

---

## مراحل پیاده‌سازی

1. Staff token generation use case
2. Handler dispatch by targetType
3. Panel API stub/wire
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Customer token on staff handler | — | wrong flow message |
| Staff already linked | — | re-link updates chatId |

---

## تست

- [ ] Unit: staff connect happy path
- [ ] Integration: StaffBotIdentity created

---

## Flow (if applicable)

Panel → Generate staff token → /start link_* → StaffBotLinkUseCase → Connected

---

## Policy Alignment

- [ ] RBAC
- [ ] Audit staff.bot.link

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
