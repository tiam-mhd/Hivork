# TASK-{NNN}: {عنوان}

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | {N} |
| Epic | Epic-{NN}-{Name} |
| ID | TASK-{NNN} |
| Priority | P0 / P1 / P2 |
| Depends on | TASK-... |
| Blocks | TASK-... |
| Estimated | {X}h |

---

## هدف

{چرا این task وجود دارد — یک پارagraph}

---

## معیار پذیرش

- [ ] ...
- [ ] ...

---

## مشخصات فنی

{schema کامل / API / pattern — بدون ابهام}

### Base fields (if Prisma business model)

```prisma
// See Epic-04 README + SOFT-DELETE-POLICY
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | |
| Update | |

---

## مراحل پیاده‌سازی

1. ...
2. ...

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| | | |

---

## تست

- [ ] Unit: ...
- [ ] Integration: ...
- [ ] E2E (if applicable): ...

---

## UX (if UI)

- [ ] Form: Excellence §5
- [ ] Page: Excellence §7 (loading, empty, error, no-permission)

---

## Flow (if applicable)

```
Entry → Step 1 → ... → Success
         ↘ Error path → Recovery
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §...
- [ ] SOFT-DELETE-POLICY (if data)
- [ ] ADR-...

---

## مراجع

- `docs/...`
- `docs/08-decisions/adr-log.md` — ADR-...

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | | |
| Alignment (sync docs، contracts، Epic README) | /15 | | |
| **جمع** | **/100** | | ≥95 required برای Ready |
