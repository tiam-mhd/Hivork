# قوانین نگارش مستندات — Hivork

> **وضعیت:** اجباری هنگام ایجاد یا ویرایش هر سند در `docs/`  
> **هدف:** مستندات هر بار قابل اجرا، هم‌تراز با کد، و **امتیاز بررسی ≥ 95/100**  
> **نسخه:** 1.1 — 1405/04/08  
> **ADRهای مرتبط:** ADR-013 (soft delete)، ADR-016 (API versioning)

---

## ۱. قبل از نوشتن

```
1. docs/README.md — جایگاه سند را بدان
2. docs/08-decisions/adr-log.md — ADR موجود؟
3. DEVELOPMENT_RULES + EXCELLENCE-STANDARDS + SOFT-DELETE-POLICY
4. Phases/ — اگر task/فاز مرتبط است، هم‌تراز باش
5. تضاد با ADR؟ → ADR جدید بنویس، بعد doc
```

---

## ۲. ساختار `docs/`

```
docs/
├── README.md                 # فهرست — تنها نقطه ورود
├── 01-product/               # محصول، بازار
├── 02-architecture/          # معماری، RBAC، tenant
├── 03-modules/{module}/      # domain، state machine
├── 04-technology/            # stack، monorepo
├── 05-channels/              # UI، bot، notification
├── 06-operations/            # security، test
├── 07-roadmap/               # فازها، operational checklist
├── 08-decisions/             # ADR-log
└── 09-development/           # قوانین توسعه + این سند
```

| نوع محتوا | مسیر |
|-----------|------|
| تصمیم معماری | `08-decisions/adr-log.md` (+ ADR entry) |
| entity / field list | `02-architecture/` یا `03-modules/` |
| قوانین توسعه | `09-development/` |
| checklist عملیاتی | `07-roadmap/` |

**ممنوع:** doc پراکنده در root بدون لینک از `docs/README.md`

---

## ۳. قالب هر سند

```markdown
# عنوان — Hivork

> وضعیت: Draft | Approved | Deprecated
> نسخه: x.y — تاریخ شمسی/میلادی
> ADRهای مرتبط: ADR-00X

## (بدنه)

---

*آخرین به‌روزرسانی: ...*
```

---

## ۴. قوانین محتوا

### ۴.۱ دقت و اجرایی بودن

| ✅ | ❌ |
|----|-----|
| schema کامل با فیلدها | «بعداً اضافه می‌شود» |
| flow گام‌به‌گام + error paths | فقط happy path |
| مثال JSON/API | توضیح مبهم |
| ارجاع به ADR | contradict بدون ADR |

### ۴.۲ هم‌ترازی اجباری (سه‌گانه)

هر سند entity/domain باید با **هر سه** هم‌تراز باشد:

| لایه | مرجع |
|------|------|
| Policy | EXCELLENCE §8, SOFT-DELETE-POLICY |
| Architecture | tenancy-and-entities.md, rbac.md |
| Tasks | `Phases/.../TASK-*.md` |

**قانون:** فیلد در Excellence §8 → باید در architecture doc **و** task مربوطه باشد.

### ۴.۳ Soft Delete در docs

- هر entity business: `deletedAt`, `deletedById`, `deleteReason?`
- استثناها **صریح** لیست شوند: AuditLog, OutboxEvent, Redis OTP
- **هرگز** `onDelete: Cascade` hard delete در schema docs

### ۴.۴ Base fields (هر جدول business)

```
id, createdAt, updatedAt, createdById, updatedById,
deletedAt, deletedById, deleteReason?, version, metadata
```

---

## ۵. `docs/README.md`

- هر سند **یک بار** در جدول — **بدون duplicate**
- شماره‌گذاری sequential (16, 16b, 17 — نه دو 19b)
- لینک به `Phases/` اگر فاز detail دارد
- بخش «وضعیت مستندات» به‌روز

---

## ۶. ADR

**چه موقع ADR جدید:**

- تصمیم معماری جدید
- تغییر breaking در entity، RBAC، soft delete
- انتخاب tech جدید

**قالب:** از template در `adr-log.md` — وضعیت Accepted قبل از implement

---

## ۷. sync با Phases

| تغییر در | به‌روز کن |
|----------|-----------|
| entity fields در docs | TASK prisma + contracts مربوطه |
| flow جدید | TASK vertical slice + auth tasks |
| permission جدید | rbac.md + seed task + ADR if needed |
| policy جدید | همه taskهای affected + cursor rules |

---

## ۸. زبان و سبک

- فارسی برای توضیح؛ identifiers انگلیسی (`tenantId`, `CreateSale`)
- جمله کامل — نه telegraphic
- diagram: mermaid یا ascii وقتی flow پیچیده است
- code block با language tag

---

## ۹. Checklist بررسی نهایی (قبل از Approved)

### ساختار (20 امتیاز)

- [ ] در `docs/README.md` لینک شده
- [ ] header با وضعیت و نسخه
- [ ] ADRهای مرتبط cited
- [ ] بدون duplicate در فهرست

### دقت (30 امتیاز)

- [ ] با ADRها ناسازگار نیست
- [ ] فیلدهای entity با EXCELLENCE §8 هم‌تراز
- [ ] soft delete / base fields رعایت شده
- [ ] error paths و edge cases documented

### اجرایی (30 امتیاز)

- [ ] dev بدون سؤال بتواند implement کند
- [ ] API/schema/example کافی
- [ ] cross-link به task files اگر وجود دارد

### هم‌ترازی (20 امتیاز)

- [ ] tasks مرتبط بررسی و sync شده
- [ ] operational-phases در صورت نیاز
- [ ] cursor rules اگر policy جدید

**حداقل برای Approved: 95/100** — اگر زیر 95، قبل از merge اصلاح.

---

## ۱۰. Rubric امتیازدهی سریع

| امتیاز | معنی |
|--------|------|
| 95–100 | Approved — کامل، هم‌تراز، executable |
| 90–94 | Minor gaps — اصلاح کوچک |
| 80–89 | Policy-task drift — اصلاح قبل implement |
| <80 | بازنویسی |

---

## ۱۱. مراجع

- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [EXCELLENCE-STANDARDS.md](./EXCELLENCE-STANDARDS.md)
- [SOFT-DELETE-POLICY.md](./SOFT-DELETE-POLICY.md)
- [PHASE_EPIC_TASK_AUTHORING_RULES.md](./PHASE_EPIC_TASK_AUTHORING_RULES.md)
- [CODE-REVIEW-GUIDE.md](./CODE-REVIEW-GUIDE.md) — نقد و بررسی doc changes
- [BRANCHING-STRATEGY.md](./BRANCHING-STRATEGY.md) — commit format برای doc PRs

---

*نسخه 1.1 — 1405/04/08*  
*این سند با `.cursor/rules/10-documentation-authoring.mdc` همگام است.*
