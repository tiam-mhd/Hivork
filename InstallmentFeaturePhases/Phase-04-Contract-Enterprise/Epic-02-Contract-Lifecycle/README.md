# Epic-02 — Contract Lifecycle

> **Phase:** 04 — Contract Enterprise  
> **تسک‌ها:** IFP-059 → IFP-064  
> **Priority:** P0

---

## هدف Epic

پیاده‌سازی **چرخه عمر قرارداد Enterprise**: تمدید، کپی، فسخ، بستن، آرشیو، و تغییر وضعیت — با domain transitions، use cases، audit، و API staff.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-059 | [IFP-TASK-059-domain-sale-lifecycle.md](./IFP-TASK-059-domain-sale-lifecycle.md) | Domain — Sale lifecycle transitions + extended status | IFP-055, Phase 1 TASK-065 | P0 |
| IFP-060 | [IFP-TASK-060-usecase-extend-contract.md](./IFP-TASK-060-usecase-extend-contract.md) | Use Case — Extend contract (تمدید) | IFP-059, IFP-058 | P0 |
| IFP-061 | [IFP-TASK-061-usecase-copy-contract.md](./IFP-TASK-061-usecase-copy-contract.md) | Use Case — Copy contract (کپی) | IFP-059, IFP-058 | P0 |
| IFP-062 | [IFP-TASK-062-usecase-terminate-contract.md](./IFP-TASK-062-usecase-terminate-contract.md) | Use Case — Terminate contract (فسخ) | IFP-059 | P0 |
| IFP-063 | [IFP-TASK-063-usecase-close-archive-contract.md](./IFP-TASK-063-usecase-close-archive-contract.md) | Use Case — Close + Archive + Restore | IFP-059 | P0 |
| IFP-064 | [IFP-TASK-064-api-contract-lifecycle.md](./IFP-TASK-064-api-contract-lifecycle.md) | API — Lifecycle endpoints + change status | IFP-060–063, IFP-058 | P0 |

---

## Dependency داخلی Epic

```
IFP-059
  ├── IFP-060
  ├── IFP-061
  ├── IFP-062
  └── IFP-063
         │
         ▼
      IFP-064
```

---

## Policy notes

- فسخ/لغو/بستن: **status transition** — نه hard delete (ADR-013)
- آرشیو: `archivedAt` + فیلتر list؛ soft delete جداگانه برای recycle bin
- هر transition حساس: `AuditLog` + permission `installments.sale.*`
- Branch scope: `@ApplyDataScope()` — ADR-015
- تمدید/کپی: ایجاد `ContractVersion` snapshot قبل از تغییر (IFP-056)

---

*Epic-02 — Phase 04*
