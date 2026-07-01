# Phase 04 — Contract Enterprise

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/10  
> **تسک‌ها:** IFP-TASK-055 → IFP-TASK-078 (۲۴ تسک)  
> **حوزه محصول:** [`installment-module-features.md` §۴ قراردادها](../../docs/01-product/installment-module-features.md) · [§۱۵ تنظیمات اقساط](../../docs/01-product/installment-module-features.md)  
> **قوانین:** [`PHASE_EPIC_TASK_AUTHORING_RULES.md`](../../docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md)

---

## هدف فاز

ارتقای **قرارداد/فروش قسطی** از MVP Phase 1 به سطح **Enterprise**: نسخه‌بندی، پیوست، چرخه عمر کامل (تمدید، کپی، فسخ، بستن، آرشیو)، ضامن/وثیقه، اقلام و مالیات/بیمه، و **تنظیمات پیشرفته اقساط** (جریمه، سود، گرد کردن، تعطیلات، شماره‌گذاری، تقویم).

---

## Exit Criteria (فاز کامل شد وقتی…)

- [ ] همه تسک‌های **P0** (IFP-055 → IFP-078) وضعیت Done دارند
- [ ] Vertical slice pass: **قرارداد Enterprise → ضامن/وثیقه → اقلام → تمدید/کپی → آرشیو → تنظیمات جریمه/سود**
- [ ] Integration tests: lifecycle transitions، cross-tenant fail، RBAC allow/deny
- [ ] Domain tests: Sale enterprise status transitions، BR sum invariant حفظ شده
- [ ] هیچ `prisma.*.delete()` روی business models — CI grep pass
- [ ] `TRACEABILITY-MATRIX.md`: §۴ و §۱۵ پوشش ۱۰۰٪
- [ ] self-review ≥ **95/100** روی همه task specs

---

## Epics (جدول)

| Epic | ID Range | عنوان | Priority |
|------|----------|--------|----------|
| [Epic-01-Contract-Schema](./Epic-01-Contract-Schema/) | IFP-055–058 | Prisma + Contracts — Sale extended، Version، Attachment | P0 |
| [Epic-02-Contract-Lifecycle](./Epic-02-Contract-Lifecycle/) | IFP-059–064 | Domain + Use Cases + API — تمدید، کپی، فسخ، بستن، آرشیو، وضعیت | P0 |
| [Epic-03-Guarantor-Collateral](./Epic-03-Guarantor-Collateral/) | IFP-065–067 | ضامن و وثیقه — schema، domain، API | P0 |
| [Epic-04-Contract-Financials](./Epic-04-Contract-Financials/) | IFP-068–071 | مالیات، بیمه، اقلام قرارداد | P0 |
| [Epic-05-Installment-Settings](./Epic-05-Installment-Settings/) | IFP-072–075 | تنظیمات §۱۵ — جریمه، سود، گرد کردن، تعطیلات، شماره‌گذاری | P0 |
| [Epic-06-Contract-Frontend](./Epic-06-Contract-Frontend/) | IFP-076–077 | UI قرارداد Enterprise + تنظیمات اقساط | P0 |
| [Epic-07-Phase04-Tests](./Epic-07-Phase04-Tests/) | IFP-078 | Integration + E2E vertical slice فاز ۴ | P0 |

**مجموع:** ۲۴ تسک

---

## ترتیب اجرا (dependency graph)

```
IFP Phase 03 Done (Customer Enterprise)
         │
         ▼
    IFP-055 (Sale extended Prisma)
         │
         ├──► IFP-056 (ContractVersion)
         ├──► IFP-057 (ContractAttachment)
         └──► IFP-058 (Zod contracts enterprise)
                  │
                  ▼
    IFP-059 (Domain lifecycle) ──► IFP-060..063 (extend/copy/terminate/close/archive UC)
                  │
                  ▼
             IFP-064 (Lifecycle API)
                  │
    IFP-065 (Guarantor Prisma) ──► IFP-066 (Collateral Prisma) ──► IFP-067 (API)
                  │
    IFP-068..070 (Tax/Insurance/LineItems Prisma) ──► IFP-071 (Financials UC + API)
                  │
    IFP-072..075 (Settings schema → UC → API) — parallel با Epic-04 پس از IFP-058
                  │
                  ▼
    IFP-076 (Contract pages) ──► IFP-077 (Lifecycle + settings UI)
                  │
                  ▼
             IFP-078 (Phase 04 tests)
```

### موازی‌سازی مجاز

| بعد از | موازی |
|--------|--------|
| IFP-058 | Epic-03 (065–067) و Epic-04 (068–071) و Epic-05 (072–075) |
| IFP-064 + IFP-067 + IFP-071 + IFP-075 | Epic-06 Frontend |

---

## وابستگی به فاز قبل

| پیش‌نیاز | منبع | دلیل |
|----------|------|------|
| Sale MVP schema | Phase 1 TASK-061 | توسعه، نه جایگزینی |
| CreateSale / CancelSale | Phase 1 TASK-072, 073 | پایه lifecycle |
| Installments settings base | Phase 1 TASK-070, 078, 079 | گسترش keys §۱۵ |
| Customer Enterprise | IFP Phase 03 | ضامن از TenantCustomer |
| Auth + RBAC | Phase 0 + IFP Phase 01 | permission guards |
| File storage | IFP Phase 10 (یا stub) | پیوست قرارداد — IFP-057 با `fileId` FK |

---

## پوشش محصول (§۴ + §۱۵)

| فیچر محصول | Task |
|------------|------|
| نسخه‌ها، پیوست، فایل قرارداد | IFP-056, 057, 058 |
| تمدید، کپی، فسخ، بستن، آرشیو، تغییر وضعیت | IFP-059–064 |
| ضامن، وثیقه | IFP-065–067 |
| اقلام، مالیات، بیمه | IFP-068–071 |
| جریمه، سود، گرد کردن، تعطیلات، شمسی/میلادی، شماره‌گذاری | IFP-072–075 |
| مشاهده جزئیات، چاپ (UI hook) | IFP-076, 077 |

---

## قوانین

- [PHASE_EPIC_TASK_AUTHORING_RULES.md](../../docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md)
- [SOFT-DELETE-POLICY.md](../../docs/09-development/SOFT-DELETE-POLICY.md) — آرشیو ≠ hard delete
- [EXCELLENCE-STANDARDS.md](../../docs/09-development/EXCELLENCE-STANDARDS.md) §8 Sale
- ADR-007 (bigint)، ADR-013 (soft delete)، ADR-015 (branch)، ADR-016 (API v1)

---

## مراجع

- [domain.md](../../docs/03-modules/installments/domain.md)
- [state-machines.md](../../docs/03-modules/installments/state-machines.md)
- [BUSINESS-RULES.md](../../docs/03-modules/installments/BUSINESS-RULES.md)
- [STAFF-FLOWS.md](../../docs/03-modules/installments/STAFF-FLOWS.md)
- [InstallmentFeaturePhases README](../README.md)

---

*آخرین به‌روزرسانی: 1405/04/10*
