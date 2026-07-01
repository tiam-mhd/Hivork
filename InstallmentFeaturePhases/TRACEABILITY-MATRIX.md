# Traceability Matrix — Feature → Phase → Epic → Task

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/10  
> **منبع:** [`installment-module-features.md`](../docs/01-product/installment-module-features.md)

---

## راهنما

| ستون | معنی |
|------|------|
| **Feature** | bullet از سند محصول |
| **Phase** | InstallmentFeaturePhases |
| **Epic** | پوشه Epic |
| **Task** | IFP-TASK-ID |

---

## §۱ — صفحه ورود

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| ورود با شماره موبایل | 0 (موجود) | Epic-06-Auth | TASK-036 |
| ورود با کد یکبارمصرف | 0 (موجود) | Epic-06-Auth | TASK-036 |
| ورود با رمز | 01 | Epic-01-Password-Credentials | IFP-001, IFP-002, IFP-018 (#1, E1) |
| ورود دو مرحله‌ای OTP | 01 | Epic-02-OTP-MFA | IFP-004, IFP-018 (#2, E2) |
| 2FA TOTP | 01 | Epic-02-OTP-MFA | IFP-005, IFP-018 (#3) |
| فراموشی رمز | 01 | Epic-02-OTP-MFA | IFP-006, IFP-018 (#4, E3) |
| تغییر شماره | 01 | Epic-02-OTP-MFA | IFP-007 |
| نمایش آخرین ورود | 01 | Epic-03-Session-Device | IFP-010, IFP-018 (#7) |
| تشخیص دستگاه | 01 | Epic-03-Session-Device | IFP-008, IFP-010, IFP-018 (#5, E5) |
| Captcha | 01 | Epic-04-Login-Hardening | IFP-012, IFP-018 (#9) |
| محدودیت دفعات ورود | 01 | Epic-04-Login-Hardening | IFP-013, IFP-018 (#10) |
| Remember Me | 01 | Epic-03-Session-Device | IFP-011, IFP-018 (#8, #12) |
| خروج از همه دستگاه‌ها | 01 | Epic-03-Session-Device | IFP-009, IFP-018 (#6, E5) |

**Phase 01 exit gate tests:** `IFP-018` — integration `packages/integration-tests/src/phase-01-auth/`, E2E `apps/web/e2e/phase-01-auth.e2e.spec.ts`, RBAC R1–R6, API keys R5–R6, change password #11 / E4.

---

## §۲ — داشبورد

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| KPI cards (۱۵ مورد) | 07 | Epic-01-Dashboard-KPIs | IFP-119 |
| نمودار فروش ماهانه | 07 | Epic-02-Dashboard-Charts | IFP-120 |
| نمودار وصول اقساط | 07 | Epic-02-Dashboard-Charts | IFP-121 |
| نمودار معوقات | 07 | Epic-02-Dashboard-Charts | IFP-122 |
| نمودار ثبت مشتری | 07 | Epic-02-Dashboard-Charts | IFP-123 |
| نمودار ثبت قرارداد | 07 | Epic-02-Dashboard-Charts | IFP-124 |
| نمودار پرداخت آنلاین/حضوری | 07 | Epic-02-Dashboard-Charts | IFP-125 |
| ویجت آخرین فعالیت‌ها | 07 | Epic-03-Dashboard-Widgets | IFP-126 |
| ویجت آخرین پرداخت‌ها | 07 | Epic-03-Dashboard-Widgets | IFP-127 |
| ویجت مشتریان بدهکار | 07 | Epic-03-Dashboard-Widgets | IFP-128 |
| ویجت یادآوری‌ها | 07 | Epic-03-Dashboard-Widgets | IFP-129 |
| ویجت اعلان‌ها | 07 | Epic-03-Dashboard-Widgets | IFP-130 |
| ویجت قراردادهای نزدیک پایان | 07 | Epic-03-Dashboard-Widgets | IFP-131 |
| ویجت اقساط امروز/فردا/هفته | 07 | Epic-03-Dashboard-Widgets | IFP-132 |
| صفحه داشبورد UI | 07 | Epic-07-Dashboard-Frontend | IFP-137 |

---

## §۳ — مدیریت مشتریان

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| لیست/مشاهده/ثبت/ویرایش | 1+03 | Epic-02-Customer-CRUD | TASK-084+ IFP-036,037 |
| حذف/آرشیو | 03 | Epic-02-Customer-CRUD | IFP-038 |
| ادغام مشتری | 03 | Epic-06-Customer-Advanced | IFP-050 |
| انتقال مالکیت | 03 | Epic-06-Customer-Advanced | IFP-051 |
| برچسب/دسته‌بندی | 03 | Epic-01-Customer-Schema | IFP-033 |
| جستجو/فیلتر/مرتب | 02+03 | Epic-02-Filter, Epic-03 | IFP-022, IFP-040 |
| چاپ/Excel/PDF | 02+03 | Epic-03-Export, Epic-03 | IFP-025,026, IFP-042 |
| تاریخچه/سوابق | 03 | Epic-05-Customer-History | IFP-046–049 |
| یادداشت داخلی | 03 | Epic-05-Customer-History | IFP-047 |
| فایل‌ها/تصاویر/مدارک | 03 | Epic-04-Customer-Documents | IFP-043–045 |
| آدرس/لوکیشن | 03 | Epic-01, Epic-04 | IFP-033, IFP-045 |
| شماره تماس/اضطراری | 03 | Epic-01 | IFP-033, IFP-035 |
| اعتبارسنجی/امتیاز/بلک‌لیست | 03 | Epic-06-Customer-Advanced | IFP-052 |
| UI کامل | 03 | Epic-07-Customer-Frontend | IFP-053 |

---

## §۴ — مدیریت قراردادها

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| ثبت/ویرایش/حذف | 1+04 | Epic-02-Lifecycle | TASK-072+ IFP-059 |
| تمدید/کپی/فسخ/لغو/بستن/آرشیو | 04 | Epic-02-Contract-Lifecycle | IFP-059–064 |
| تغییر وضعیت/جزئیات | 04 | Epic-02 | IFP-059, IFP-064 |
| چاپ/فایل/نسخه/پیوست/امضاء | 04 | Epic-01,05 | IFP-055–058, IFP-076 |
| تقویم/محاسبه اقساط | 04 | Epic-05-Installment-Settings | IFP-072–075 |
| جریمه/تخفیف/پیش‌پرداخت | 04 | Epic-04-Financials | IFP-068–071 |
| ضامن/وثیقه/اقلام/مالیات/بیمه | 04 | Epic-03,04 | IFP-065–071 |
| شرایط اختصاصی/تاریخچه | 04 | Epic-01,02 | IFP-055, IFP-064 |

---

## §۵ — مدیریت اقساط

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| ثبت/ویرایش (schedule) | 05 | Epic-01-Installment-Operations | IFP-079–084 |
| بازتولید/جابجایی/تعویق/تعجیل | 05 | Epic-01-Installment-Operations | IFP-080–081 |
| تقسیط مجدد/ادغام/تقسیم | 05 | Epic-01 | IFP-080–082 |
| پرداخت کامل/جزئی | 05 | Epic-02-Payment-Recording | IFP-085–090 |
| ثبت دستی/بانکی/آنلاین/POS/نقد/چک/حواله/انتقال | 05 | Epic-02 | IFP-085–092 |
| بخشودگی/جریمه/تخفیف/هزینه/برگشت | 05 | Epic-04-Adjustments | IFP-093–096 |
| ابطال/تایید/رد پرداخت | 05 | Epic-03-Payment-Confirmation | IFP-097–099 |
| چاپ/ارسال رسید/سوابق/یادداشت/فایل | 05 | Epic-03,05 | IFP-098, IFP-099, IFP-097–099 |
| وضعیت/رنگ/اعلان/یادآوری | 05+08 | Epic-05,08 | IFP-097–099, IFP-139+ |

---

## §۶ — پرداخت‌ها

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| تمام تراکنش‌ها | 06 | Epic-01-Payment-Ledger | IFP-101–103 |
| روش‌های پرداخت | 06 | Epic-02-Payment-Methods | IFP-104–108 |
| استرداد/ابطال/تسویه/مغایرت | 06 | Epic-03-Refund-Void | IFP-109–112 |
| رسید/فاکتور | 06 | Epic-05-Frontend | IFP-113–115 |

---

## §۷ — چک‌ها

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| ثبت دریافتی/پرداختی | 06 | Epic-04-Check-Management | IFP-116 |
| سررسید/برگشتی/وصول/انتقال | 06 | Epic-04 | IFP-117 |
| تصویر/بانک/پیگیری | 06 | Epic-04 | IFP-116, IFP-117 |

---

## §۸ — اعلان‌ها

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| پیامک/بله/درون‌برنامه/ایمیل/Push | 08 | Epic-01-Notification-Core | IFP-139–143 |
| قالب/زمان‌بندی/گروهی/خودکار/تاریخچه | 08 | Epic-01 | IFP-144–146 |

---

## §۹ — اتوماسیون

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| قوانین/Workflow/Trigger/Action | 08 | Epic-04-Automation-Engine | IFP-150–154 |
| زمان‌بندی/سناریوها | 08 | Epic-04 | IFP-155, IFP-156 |

---

## §۱۰ — گزارشات

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| گزارش مالی/اقساط/مشتری/قرارداد/وصول/معوق/کاربر/پرداخت/پیامک/ربات | 07 | Epic-04-Reports-Engine | IFP-133–136 |
| روزانه/هفتگی/ماهانه/سالانه | 07 | Epic-05-Reports-Export | IFP-133 |
| نموداری/Pivot/Excel/PDF | 07 | Epic-05 | IFP-134, IFP-135 |

---

## §۱۱ — تقویم

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| تقویم اقساط/قرارداد/پرداخت | 07 | Epic-06-Calendar | IFP-136 |
| تعطیلات/یادآورها | 07 | Epic-06 | IFP-136 |

---

## §۱۲ — فایل‌ها

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| مدیریت/تصاویر/اسناد/پشتیبان/دسته/جستجو | 10 | Epic-01-File-Management | IFP-172–177 |

---

## §۱۳ — کاربران

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| مدیریت کاربران/نقش/دسترسی/گروه | 09 | Epic-01,02 | IFP-157–165 |
| ورودها/Log | 09 | Epic-01 | IFP-158, IFP-159 |

---

## §۱۴ — تنظیمات فروشگاه

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| اطلاعات/لوگو/تماس/آدرس | 09 | Epic-03-Store-Settings | IFP-166–168 |
| مالی/درگاه/مالیات/ساعت کاری | 09 | Epic-03 | IFP-169–171 |

---

## §۱۵ — تنظیمات اقساط

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| فرمول/جریمه/سود/گرد کردن | 04 | Epic-05-Installment-Settings | IFP-072–074 |
| تعطیلات/شمسی/میلادی/شماره‌گذاری | 04 | Epic-05 | IFP-074, IFP-075 |

---

## §۱۶ — ربات بله

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| اتصال/توکن/وضعیت | 4+08 | Phase-4 + Epic-03-Bale-Admin | TASK-146+ IFP-147 |
| پیام/منو/دکمه/قالب/Broadcast/کاربران | 08 | Epic-03-Bale-Admin | IFP-147–149 |

---

## §۱۷ — پیامک

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| پنل/خطوط/قالب/اعتبار/تاریخچه/الگو | 08 | Epic-02-SMS-Panel | IFP-140–146 |

---

## §۱۸ — حسابداری

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| صندوق/بانک/دریافت/پرداخت/اسناد | 11 | Epic-01,02 | IFP-188–193 |
| دفتر کل/تراز/سود و زیان | 11 | Epic-03-Ledger-Reports | IFP-194–197 |

---

## §۱۹ — لاگ سیستم

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| لاگ کاربر/API/خطا/امنیت/Audit | 10 | Epic-02-System-Logs | IFP-178–182 |

---

## §۲۰ — امنیت

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| تغییر رمز/2FA/دستگاه/IP/نشست/توکن/API key | 01 | Epic-05-Security-Settings | IFP-015–017 |

---

## §۲۱ — Backup

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| Backup/Restore/دانلود/آپلود/زمان‌بندی | 10 | Epic-03-Backup-Restore | IFP-183–186 |

---

## §۲۲ — اشتراک

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| پلن/تمدید/پرداخت/صورتحساب/فاکتور/سقف | 10 | Epic-04-Subscription-Billing | IFP-184–186 |

---

## §۲۳ — پشتیبانی

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| تیکت/چت/راهنما/FAQ/مستندات | 10 | Epic-05-Support-Help | IFP-187 |

---

## Cross-Cutting — قابلیت‌های عمومی

| Feature | Phase | Epic | Task |
|---------|-------|------|------|
| جستجوی لحظه‌ای | 02 | Epic-02-Filter-Search | IFP-023 |
| فیلتر پیشرفته چندشرطی | 02 | Epic-02-Filter-Search | IFP-022 |
| مرتب‌سازی/صفحه‌بندی | 02 | Epic-01-DataTable-Engine | IFP-019 |
| انتخاب چندتایی/عملیات گروهی | 02 | Epic-01-DataTable-Engine | IFP-020 |
| خروجی Excel/PDF/چاپ | 02 | Epic-03-Export-Print | IFP-025, IFP-026 |
| شخصی‌سازی/ذخیره فیلتر/ذخیره نما | 02 | Epic-01,04 | IFP-021, IFP-024, IFP-027 |
| Drag & Drop ستون‌ها | 02 | Epic-01-DataTable-Engine | IFP-021 |
| تاریخچه تغییرات Audit | 02+all | AuditLog (Phase 0) + detail tabs | TASK-047 |
| Undo عملیات مهم | 02 | Epic-06-Realtime-Undo | IFP-032 |
| میانبر صفحه‌کلید | 02 | Epic-06-Realtime-Undo | IFP-032 |
| RBAC | 0+all | Guards Phase 0 | TASK-041+ |
| واکنش‌گرایی | 02+all | Cross-cutting UI | IFP-029 |
| حالت تاریک/روشن | 02 | Epic-05-Theme-i18n | IFP-029 |
| چندزبانه | 02 | Epic-05-Theme-i18n | IFP-030 |
| اعلان لحظه‌ای | 02 | Epic-06-Realtime-Undo | IFP-031 |
| Drag-drop upload | 02+03 | File patterns | IFP-043 |
| تاریخ شمسی/میلادی | 02 | Epic-05-Theme-i18n | IFP-030 |
| QR/Barcode | 05+06 | Receipt/export tasks | IFP-098, IFP-115 |

---

## Coverage Summary

| بخش محصول | تعداد bullet | پوشش IFP | وضعیت |
|-----------|-------------|----------|--------|
| §۱–§۲۳ | ~۲۲۰ | ۱۰۰٪ mapped | ✅ |
| Cross-cutting | ۲۳ | ۱۰۰٪ mapped | ✅ |

---

*آخرین به‌روزرسانی: 1405/04/10*