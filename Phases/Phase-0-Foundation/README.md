# Phase 0 — Foundation

| Epic | تسک‌ها | Prefix |
|------|--------|--------|
| [Epic-01-Infrastructure](./Epic-01-Infrastructure/) | TASK-001 → 005 | Infra |
| [Epic-02-Apps-Skeleton](./Epic-02-Apps-Skeleton/) | TASK-006 → 009 | Apps |
| [Epic-03-Packages-Skeleton](./Epic-03-Packages-Skeleton/) | TASK-010 → 016, **059** | Packages |
| [Epic-04-Database](./Epic-04-Database/) | TASK-017 → 028 | DB |
| [Epic-05-Domain-Core](./Epic-05-Domain-Core/) | TASK-029 → 034 | Domain |
| [Epic-06-Auth](./Epic-06-Auth/) | TASK-035 → 040, **055** | Auth |
| [Epic-07-Middleware-Guards](./Epic-07-Middleware-Guards/) | TASK-041 → 046 | Guards |
| [Epic-08-Core-Services](./Epic-08-Core-Services/) | TASK-047 → 050, **056–058** | Services |
| [Epic-09-Contracts](./Epic-09-Contracts/) | TASK-051 → 053 | Contracts |
| [Epic-10-Vertical-Slice](./Epic-10-Vertical-Slice/) | TASK-054 | E2E |

**مجموع:** 59 تسک (TASK-001 → TASK-059)

## ترتیب اجرا

```
001 → 002 → 003
010–016, 059
006–009
017–027 → 028
029–034
051–053
047–050, 056–058
035–040, 055
041–046
054
```

## تسک‌های ارتقای Phase 0 (055–059)

| ID | عنوان |
|----|--------|
| 055 | Onboarding auth flow (register + login unified) |
| 056 | Soft delete & restore use cases |
| 057 | Register tenant use case |
| 058 | Create tenant customer use case |
| 059 | Installments module skeleton |

## قوانین

- قبل از هر تسک: `AGENTS.md` + `DEVELOPMENT_RULES.md` + `EXCELLENCE-STANDARDS.md` + `SOFT-DELETE-POLICY.md`
- **ایجاد/ویرایش Task:** [PHASE_EPIC_TASK_AUTHORING_RULES.md](../../docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md) + [TASK-TEMPLATE.md](../../docs/09-development/TASK-TEMPLATE.md)
- **ایجاد/ویرایش Doc:** [DOCUMENTATION_AUTHORING_RULES.md](../../docs/09-development/DOCUMENTATION_AUTHORING_RULES.md)
- هر Epic **README اجباری** — هر Task **یک فایل** — self-review ≥ **95/100**

## Quality Target

Phase 0 task specs: **≥95/100** — aligned with ADR-012, ADR-013, ADR-014
