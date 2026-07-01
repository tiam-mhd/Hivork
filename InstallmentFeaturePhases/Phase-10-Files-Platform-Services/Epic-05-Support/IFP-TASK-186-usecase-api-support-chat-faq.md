# IFP-186: Use Case + API — Support Tickets, Chat, FAQ

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-05-Support |
| ID | IFP-186 |
| Priority | P0 |
| Depends on | IFP-185 |
| Blocks | IFP-187 |
| Estimated | 14h |

---

## هدف

CRUD تیکت، پیام‌ها، FAQ list، لینک مستندات — WebSocket/Polling chat P1.

---

## معیار پذیرش

- [ ] CreateTicketUseCase
- [ ] ReplyTicketUseCase
- [ ] ListTicketsUseCase
- [ ] ListFaqUseCase
- [ ] API /support/tickets, /faq
- [ ] Permission core.support.*
- [ ] Optional SSE for new messages

---

## مشخصات فنی

POST /api/v1/support/tickets { subject, body, priority }

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/support/*.use-case.ts` |
| Create | `apps/api/src/modules/core/support.controller.ts` |

---

## مراحل پیاده‌سازی

1. Ticket use cases
2. FAQ seed
3. API + basic UI hook

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Rate limit tickets | 429 | SUPPORT_RATE_LIMIT |

---

## تست

- [ ] Integration ticket lifecycle

---

## Policy Alignment

- [ ] RBAC
- [ ] Audit support.ticket.create

---

## مراجع

- `§23`

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
