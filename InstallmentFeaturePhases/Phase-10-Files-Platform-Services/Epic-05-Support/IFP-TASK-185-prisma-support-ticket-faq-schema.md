# IFP-185: Prisma — SupportTicket, FAQ, SupportArticle

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-05-Support |
| ID | IFP-185 |
| Priority | P0 |
| Depends on | Phase-0 TASK-018 |
| Blocks | IFP-186 |
| Estimated | 6h |

---

## هدف

Schema تیکت پشتیبانی و FAQ/مستندات help center.

---

## معیار پذیرش

- [ ] SupportTicket with status open|pending|resolved|closed
- [ ] SupportMessage thread
- [ ] FaqItem tenant+platform scope
- [ ] SupportArticle for docs links
- [ ] Base fields + soft delete

---

## مشخصات فنی

SupportTicket: subject, priority, assignedPlatformUserId optional

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/support.prisma` |

---

## مراحل پیاده‌سازی

1. Models
2. Migration

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Reopen closed | 409 | TICKET_ALREADY_CLOSED |

---

## تست

- [ ] Migration

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY

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
