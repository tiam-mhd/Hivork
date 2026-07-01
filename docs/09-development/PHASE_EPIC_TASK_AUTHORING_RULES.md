# قوانین نگارش Phase / Epic / Task — Hivork

> **وضعیت:** اجباری هنگام ایجاد فاز، Epic، یا Task  
> **هدف:** هر Task یک فایل، بدون ابهام، **امتیاز بررسی ≥ 95/100**  
> **نسخه:** 1.1 — 1405/04/08  
> **ADRهای مرتبط:** ADR-013 (soft delete)، ADR-015 (branch scope)، ADR-016 (API versioning)

---

## ۱. ساختار پوشه (اجباری)

```
Phases/
├── README.md
└── Phase-{N}-{Name}/                    # مثال: Phase-0-Foundation
    ├── README.md                        # فهرست Epic + ترتیب اجرا
    ├── Epic-{NN}-{Name}/                # مثال: Epic-04-Database
    │   ├── README.md                    # index تسک‌های Epic (اجباری)
    │   ├── TASK-{NNN}-{kebab-slug}.md   # یک تسک = یک فایل
    │   └── TASK-{NNN+1}-...
    └── Epic-{NN+1}-...
```

| قانون | |
|-------|---|
| یک Task | **دقیقاً یک فایل `.md`** |
| نام Task | `TASK-{NNN}-{kebab-case-slug}.md` — NNN سه رقم، global در Phase |
| Epic README | **اجباری** — جدول ID + عنوان + Depends |
| Phase README | ترتیب اجرا + لینک Epics |

**ممنوع:**
- چند task در یک فایل
- task بدون پوشه Epic
- epic بدون README

---

## ۲. قبل از ایجاد Task

```
1. DOCUMENTATION_AUTHORING_RULES.md
2. EXCELLENCE-STANDARDS.md (+ §8 برای entity)
3. SOFT-DELETE-POLICY.md
4. DEVELOPMENT_RULES.md
5. docs/08-decisions/adr-log.md
6. Phase README — جایگاه task در ترتیب اجرا
7. Epic README — Depends/Blocks را plan کن
```

---

## ۳. قالب اجباری هر Task

هر فایل Task **باید** این بخش‌ها را داشته باشد:

```markdown
# TASK-{NNN}: {عنوان}

## Metadata
| فیلد | مقدار |
| Phase | |
| Epic | |
| ID | TASK-{NNN} |
| Priority | P0 | P1 | P2 |
| Depends on | TASK-xxx, ... |
| Blocks | TASK-yyy, ... |
| Estimated | Xh |

## هدف
(یک پارagraph — چرا این task)

## معیار پذیرش
- [ ] ...
- [ ] ...

## مشخصات فنی
(کامل — schema، API، code pattern)

## فایل‌ها
| عمل | مسیر |

## مراحل پیاده‌سازی
1. ...
2. ...

## Edge Cases & Errors
| سناریو | رفتار |

## تست
- [ ] unit / integration / e2e

## UX (اگر UI دارد)
- [ ] Excellence §5–7 checklist

## Flow (اگر flow دارد)
(entry → steps → errors → exit)

## Policy Alignment
- [ ] EXCELLENCE-STANDARDS §...
- [ ] SOFT-DELETE-POLICY
- [ ] ADR-...

## مراجع
- docs/...
- ADR-...
```

**Task ناقص = رد در review** (امتیاز < 90)

---

## ۴. قوانین محتوای Task بر اساس نوع

### ۴.۱ Task نوع Database (Prisma)

**اجباری در schema:**

```prisma
// Base fields — EVERY business model
id           String    @id @default(uuid()) @db.Uuid
createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
createdById  String?   @map("created_by_id") @db.Uuid
updatedById  String?   @map("updated_by_id") @db.Uuid
deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
deletedById  String?   @map("deleted_by_id") @db.Uuid
deleteReason String?   @map("delete_reason")
version      Int       @default(1)
metadata     Json?     @db.JsonB
```

| قانون | |
|-------|---|
| فیلدهای entity | **همه** فیلدهای EXCELLENCE §8 برای آن entity |
| Indexes | FK + `(tenantId, status)` + unique business keys |
| Relations | `onDelete: Restrict` — **نه Cascade** hard delete |
| استثنا | AuditLog, Outbox: append-only — در task **صریح** بنویس |
| tenantId | روی همه tenant-scoped |

### ۴.۲ Task نوع Domain

- Entity methods شامل soft delete / restore (where applicable)
- State transitions از `state-machines.md`
- Unit test cases **در task** لیست شوند
- zero framework imports

### ۴.۳ Task نوع API / Use Case

- Endpoint کامل: method, path, auth, permission, module
- Request/Response JSON example
- Error codes table
- Idempotency اگر POST مالی
- Audit actions
- Permission guard + data scope

### ۴.۴ Task نوع Auth / Flow

- **تمام** actors و paths (existing user vs new tenant)
- ترتیب gating (register قبل verify یا combined)
- Rate limits
- Cookie/token names
- diagram ascii/mermaid

### ۴.۵ Task نوع Contract (Zod)

- هم‌تراز **100%** با API task + EXCELLENCE §8 fields
- `phoneSchema` از shared
- bigint as string documented

### ۴.۶ Task نوع Frontend

- Route path
- Excellence §5 form checklist
- Excellence §7 page states **همه**
- Permission-based UI (UX only)

### ۴.۷ Task نوع Infrastructure / CI

- دستورات دقیق
- CI: lint, typecheck, test, **prisma validate**, **grep hard-delete**

---

## ۵. ایجاد Phase جدید

### Phase README باید شامل:

```markdown
# Phase {N} — {Name}

## هدف فاز
## Exit Criteria (فاز کامل شد وقتی...)
## Epics (جدول)
## ترتیب اجرا (dependency graph)
## وابستگی به فاز قبل
## قوانین (لینک به authoring rules)
```

### Exit Criteria فاز

- [ ] همه P0 tasks Done
- [ ] Vertical slice تست pass
- [ ] docs sync
- [ ] self-review ≥ 95

---

## ۶. ایجاد Epic جدید

### Epic README باید شامل:

```markdown
# Epic-{NN} — {Name}

## هدف Epic
## Tasks (جدول: ID | فایل | عنوان | Depends | Priority)
## Dependency داخلی Epic
## Policy notes (soft delete, excellence section)
```

---

## ۷. Depends / Blocks

| قانون | |
|-------|---|
| Depends on | taskهایی که **قبل** باید Done باشند |
| Blocks | taskهایی که منتظر این هستند |
| بدون cycle | dependency graph acyclic |
| Phase README | ترتیب global سازگار با Depends |

**Task بدون Depends/Blocks = ناقص**

---

## ۸. Taskهایی که نباید فراموش شوند

برای هر Phase مشابه Foundation، بررسی کن:

| موضوع | Task جدا؟ |
|--------|-----------|
| Soft delete + restore use cases | ✅ |
| Onboarding / auth flow یکپارچه | ✅ |
| CI guards (hard delete grep) | ✅ در CI task |
| Seed + role clone on tenant create | ✅ در seed task |
| Module skeleton (حتی empty) | ✅ |
| Vertical slice E2E | ✅ آخر Phase |

---

## ۹. Naming & Numbering

| Item | Convention |
|------|------------|
| Phase folder | `Phase-{N}-{PascalCase}` |
| Epic folder | `Epic-{NN}-{PascalCase}` |
| Task file | `TASK-{NNN}-{kebab-slug}.md` |
| NNN | sequential در **کل Phase** (001–999) |

---

## ۱۰. Checklist بررسی نهایی Task (≥ 95/100)

### Metadata (10)
- [ ] ID, Priority, Depends, Blocks, Estimate

### Completeness (25)
- [ ] Acceptance criteria measurable
- [ ] Technical spec بدون «TODO» یا «بعداً»
- [ ] Files table complete

### Policy (25)
- [ ] EXCELLENCE §8 fields (if entity)
- [ ] Soft delete base fields (if DB)
- [ ] No Cascade hard delete
- [ ] ADR cited

### Executability (25)
- [ ] Dev implements without questions
- [ ] Edge cases table
- [ ] Tests listed

### Alignment (15)
- [ ] Sync با docs architecture
- [ ] Sync با contracts/API tasks
- [ ] Epic README updated

---

## ۱۱. Checklist بررسی نهایی Phase (≥ 95/100)

- [ ] Phase README + همه Epic README
- [ ] هر task یک فایل + قالب کامل
- [ ] ترتیب اجرا بدون contradiction (auth/register flow)
- [ ] operational-phases.md sync
- [ ] docs/README.md لینک Phase
- [ ] هیچ policy-task drift (spot check 3 prisma + 3 API tasks)

---

## ۱۲. Rubric

| Score | Action |
|-------|--------|
| 95–100 | Ready for implementation |
| 90–94 | Fix before coding |
| <90 | Rewrite task(s) |

---

## ۱۳. Template کپی سریع

فایل template: [TASK-TEMPLATE.md](./TASK-TEMPLATE.md)

---

## ۱۴. مراجع

- [DOCUMENTATION_AUTHORING_RULES.md](./DOCUMENTATION_AUTHORING_RULES.md)
- [EXCELLENCE-STANDARDS.md](./EXCELLENCE-STANDARDS.md)
- [SOFT-DELETE-POLICY.md](./SOFT-DELETE-POLICY.md)
- [CODE-REVIEW-GUIDE.md](./CODE-REVIEW-GUIDE.md) — checklist PR برای tasks با code
- [BRANCHING-STRATEGY.md](./BRANCHING-STRATEGY.md) — commit naming برای task implementation
- `Phases/Phase-0-Foundation/Epic-04-Database/README.md` — base fields

---

*نسخه 1.1 — 1405/04/08*  
*این سند با `.cursor/rules/11-phase-epic-task-authoring.mdc` همگام است.*
