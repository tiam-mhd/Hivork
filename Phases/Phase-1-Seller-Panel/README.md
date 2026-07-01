# Phase 1 — Seller Panel (پنل فروشنده)

| Epic | تسک‌ها | حوزه |
|------|--------|------|
| [Epic-01-Installments-Module-Setup](./Epic-01-Installments-Module-Setup/) | TASK-060 | Module |
| [Epic-02-Installments-Database](./Epic-02-Installments-Database/) | TASK-061 → 064 | DB |
| [Epic-03-Installments-Domain](./Epic-03-Installments-Domain/) | TASK-065 → 067 | Domain |
| [Epic-04-Installments-Contracts](./Epic-04-Installments-Contracts/) | TASK-068 → 071 | Contracts |
| [Epic-05-Installments-Use-Cases](./Epic-05-Installments-Use-Cases/) | TASK-072 → 079 | Use Cases |
| [Epic-06-Installments-API](./Epic-06-Installments-API/) | TASK-080 → 083 | API |
| [Epic-07-Customer-Backend](./Epic-07-Customer-Backend/) | TASK-084 → 088 | Customer |
| [Epic-08-Core-Admin](./Epic-08-Core-Admin/) | TASK-089 → 097 | Admin |
| [Epic-09-Reports](./Epic-09-Reports/) | TASK-098 → 100 | Reports |
| [Epic-10-Frontend-Layout-Auth](./Epic-10-Frontend-Layout-Auth/) | TASK-101 → 104 | Web Shell |
| [Epic-11-Frontend-Customer-Pages](./Epic-11-Frontend-Customer-Pages/) | TASK-105 → 108 | Customer UI |
| [Epic-12-Frontend-Sales-Installments](./Epic-12-Frontend-Sales-Installments/) | TASK-109 → 113 | Sales UI |
| [Epic-13-Frontend-Admin-Settings](./Epic-13-Frontend-Admin-Settings/) | TASK-114 → 117 | Admin UI |
| [Epic-14-Phase1-Tests](./Epic-14-Phase1-Tests/) | TASK-118 → 122 | Tests |
| [Epic-15-Phase1-Vertical-Slice](./Epic-15-Phase1-Vertical-Slice/) | TASK-123 | E2E |

**مجموع:** 64 تسک (TASK-060 → TASK-123)

---

## هدف فاز

تحویل **پنل فروشنده کامل** — مشتری، فروش قسطی، اقساط، گزارش، و مدیریت (شعب، کارمندان، نقش‌ها) — با backend کامل ماژول اقساط، APIهای staff، و UI فارسی RTL.

---

## Exit Criteria (فاز کامل شد وقتی…)

- [ ] همه تسک‌های **P0** (TASK-060 → TASK-123) وضعیت Done دارند
- [ ] Vertical slice E2E pass: **مشتری → فروش → اقساط → گزارش معوقات** (TASK-123)
- [ ] Integration tests: CreateSale، CancelSale، RBAC allow/deny، cross-tenant fail
- [ ] Domain tests: BR-005 sum invariant، state transitions (paid/waived terminal)
- [ ] هیچ `prisma.*.delete()` روی business models — CI grep pass
- [ ] `@RequireModule('installments')` روی تمام endpointهای ماژول
- [ ] docs sync: `operational-phases.md` §فاز ۱ tick شده
- [ ] self-review ≥ **95/100** روی همه task specs

---

## Epics (جدول کامل)

| Epic | ID Range | عنوان | Priority |
|------|----------|--------|----------|
| Epic-01 | TASK-060 | Installments Module Setup | P0 |
| Epic-02 | TASK-061–064 | Installments Database (Prisma) | P0 |
| Epic-03 | TASK-065–067 | Installments Domain Entities | P0 |
| Epic-04 | TASK-068–071 | Installments Contracts (Zod) | P0 |
| Epic-05 | TASK-072–079 | Installments Use Cases | P0 |
| Epic-06 | TASK-080–083 | Installments API Controllers | P0 |
| Epic-07 | TASK-084–088 | Customer Backend | P0 |
| Epic-08 | TASK-089–097 | Core Admin (Branches, Staff, Roles) | P0 |
| Epic-09 | TASK-098–100 | Reports Use Cases & API | P0 |
| Epic-10 | TASK-101–104 | Frontend Auth & Layout | P0 |
| Epic-11 | TASK-105–108 | Frontend Customer Pages | P0 |
| Epic-12 | TASK-109–113 | Frontend Sales & Installments | P0 |
| Epic-13 | TASK-114–117 | Frontend Admin & Settings | P0 |
| Epic-14 | TASK-118–122 | Phase 1 Tests | P0 |
| Epic-15 | TASK-123 | Phase 1 Vertical Slice E2E | P0 |

---

## ترتیب اجرا (dependency graph)

```
Phase 0 Done (TASK-054 ✅)
         │
         ▼
    TASK-060 (module registration)
         │
         ▼
    TASK-061 → TASK-062 → TASK-063 → TASK-064 (migration)
         │
         ▼
    TASK-065 → TASK-066 → TASK-067 (domain — parallel after 064)
         │
         ▼
    TASK-068 → TASK-069 → TASK-070 → TASK-071 (contracts)
         │
         ▼
    TASK-072 → TASK-073 → TASK-074 (sales UC)
         │         │
         │         └──► TASK-075, 076, 077 (list installments)
         │
         └──► TASK-078 → TASK-079 (settings)
         │
         ▼
    TASK-080 → 083 (installments API)
         │
         ▼
    TASK-084 → 088 (customer backend)
         │
         ▼
    TASK-089 → 097 (core admin)
         │
         ▼
    TASK-098 → 100 (reports)
         │
         ▼
    TASK-101 → 104 (frontend shell)
         │
         ▼
    TASK-105 → 108 (customer pages)
         │
         ▼
    TASK-109 → 113 (sales/installments pages)
         │
         ▼
    TASK-114 → 117 (admin/settings pages)
         │
         ▼
    TASK-118 → 122 (tests)
         │
         ▼
    TASK-123 (vertical slice E2E)
```

### ترتیب فشرده Epic-01 تا Epic-05

```
060
061 → 062 → 063 → 064
065 ∥ 066 ∥ 067  (after 064)
068 → 069 → 070 → 071  (after domain)
072 → 073 → 074
075, 076, 077  (after 072)
078 → 079  (parallel with 075–077)
```

---

## وابستگی به فاز قبل

| پیش‌نیاز Phase 0 | استفاده در Phase 1 |
|------------------|---------------------|
| **TASK-054** (Vertical Slice E2E) — **باید Done باشد** | پایه auth، tenant، customer، guards |
| TASK-059 (installments skeleton) | ارتقا در TASK-060 |
| TASK-023/027 (TenantCustomer schema) | CreateSale، customer list |
| TASK-041–046 (guards) | `@RequireModule`, `@RequirePermission`, data scope |
| TASK-047–050 (audit, outbox, settings) | CreateSale transaction |
| TASK-056 (soft delete/restore) | Sale soft delete policy |
| TASK-058 (create customer UC) | Epic-07 extends |

---

## قوانین

- قبل از هر تسک: `AGENTS.md` + `DEVELOPMENT_RULES.md` + `EXCELLENCE-STANDARDS.md` + `SOFT-DELETE-POLICY.md`
- **ایجاد/ویرایش Task:** [PHASE_EPIC_TASK_AUTHORING_RULES.md](../../docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md) + [TASK-TEMPLATE.md](../../docs/09-development/TASK-TEMPLATE.md)
- **ایجاد/ویرایش Doc:** [DOCUMENTATION_AUTHORING_RULES.md](../../docs/09-development/DOCUMENTATION_AUTHORING_RULES.md)
- هر Epic **README اجباری** — هر Task **یک فایل** — self-review ≥ **95/100**

---

## مراجع docs

| موضوع | سند |
|--------|-----|
| Domain | [domain.md](../../docs/03-modules/installments/domain.md) |
| Business Rules | [BUSINESS-RULES.md](../../docs/03-modules/installments/BUSINESS-RULES.md) |
| State Machines | [state-machines.md](../../docs/03-modules/installments/state-machines.md) |
| API | [api-contracts.md](../../docs/02-architecture/api-contracts.md) §۵ |
| RBAC | [rbac.md](../../docs/02-architecture/rbac.md) |
| Soft Delete | [SOFT-DELETE-POLICY.md](../../docs/09-development/SOFT-DELETE-POLICY.md) |
| Roadmap | [operational-phases.md](../../docs/07-roadmap/operational-phases.md) |

---

## Quality Target

Phase 1 task specs: **≥95/100** — aligned with ADR-007, ADR-008, ADR-013, ADR-015
