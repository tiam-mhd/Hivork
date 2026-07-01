# واژه‌نامه دوزبانه — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **هدف:** یکسان‌سازی اصطلاحات در کد، مستندات، و ارتباطات تیمی

---

## A

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Access Token** | توکن دسترسی | JWT کوتاه‌مدت (۱۵ دقیقه) برای احراز هویت API |
| **Actor** | کنش‌گر | موجودیتی که به سیستم دسترسی دارد: Staff، Customer، Platform، System |
| **ADR** (Architecture Decision Record) | ثبت تصمیم معماری | سندی که چرایی یک تصمیم معماری را ثبت می‌کند |
| **Aggregate** | تجمیع | گروهی از entities که به عنوان یک واحد منطقی با هم مدیریت می‌شوند |
| **Audit Log** | گزارش حسابرسی | تاریخچه تغییرات حساس — append-only، غیرقابل حذف |

## B

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Bale** | بله | پیام‌رسان ایرانی (جایگزین تلگرام) — کانال دوم ربات |
| **BigInt** | عدد صحیح بزرگ | نوع داده TypeScript/JS برای اعداد بزرگ — مبالغ به ریال همیشه bigint |
| **Bot Gateway** | دروازه ربات | سرویس NestJS که webhookهای تلگرام/بله را دریافت می‌کند |
| **Bot Identity** | هویت ربات | رابطه GlobalCustomer با chat_id تلگرام/بله |
| **Branch** | شعبه | تقسیم عملیاتی یک Tenant — حداقل یک شعبه اصلی |
| **Branch Setting** | تنظیمات شعبه | override محدود از TenantSetting برای یک شعبه |
| **BullMQ** | — | کتابخانه صف کار async بر پایه Redis |

## C

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Cashflow Forecast** | پیش‌بینی جریان نقدی | گزارش جمع اقساط آینده بر اساس تاریخ |
| **Cashier** | صندوقدار | نقش سیستمی با دسترسی محدود (data_scope=branch) |
| **Clean Architecture** | معماری تمیز | الگوی معماری: Domain ← Application ← Infrastructure ← Presentation |
| **Credit Score** | امتیاز اعتباری | امتیاز هر TenantCustomer بر اساس سابقه پرداخت (۰–۱۰۰) |
| **Cursor Pagination** | صفحه‌بندی با مکان‌نما | روش page کردن لیست‌ها با cursor — نه offset |

## D

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Data Scope** | محدوده داده | سطح دسترسی Staff به داده‌ها: `all` | `branch` | `own` |
| **Deep Link** | لینک عمیق | لینک که مستقیماً مشتری را به ربات یا PWA هدایت می‌کند |
| **Domain Event** | رویداد دامنه | رویدادی که در domain رخ می‌دهد و side effectها را trigger می‌کند |
| **Domain Layer** | لایه دامنه | `packages/domain/` — منطق تجاری خالص بدون وابستگی به framework |
| **Down Payment** | پیش‌پرداخت | مبلغ اول از کل فروش که نقد دریافت می‌شود |

## E

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Effective Branch IDs** | شعب مؤثر | تقاطع شعب assign‌شده Staff با شعبه فعال session |
| **Enabled Modules** | ماژول‌های فعال | لیست ماژول‌هایی که این Tenant اجازه استفاده دارد |
| **Entity** | موجودیت | شیء domain با هویت منحصربه‌فرد (UUID) |

## G

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Global Customer** | مشتری سراسری | پروفایل B2C — FK به `User` (1:1)؛ phone روی User است (ADR-017) |
| **GDPR-like** | حریم‌خصوصی داده | pseudonymize + soft delete به جای حذف واقعی |

## H

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Hard Delete** | حذف واقعی | ❌ **ممنوع** در Hivork — داده از DB پاک می‌شود |
| **Hivork** | هیورک | نام پلتفرم — «Hive» (کندو/تیم) + «Work» |
| **HTTP Guard** | محافظ HTTP | NestJS interceptor که احراز هویت و مجوز را بررسی می‌کند |

## I

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Idempotency** | یکنواختی عملیات | اجرای چندباره عملیات = نتیجه یکسان — اجباری برای payment و reminder |
| **Idempotency Key** | کلید یکنواختی | header `Idempotency-Key` برای شناسه‌گذاری درخواست‌های تکراری |
| **Installment** | قسط | یک پرداخت دوره‌ای از یک فروش قسطی |
| **Invariant** | قانون ثابت | قانون domain که هرگز توسط tenant قابل تغییر نیست |
| **ICP** (Ideal Customer Profile) | مشتری ایده‌آل | ویژگی‌های فروشگاه هدف برای بازاریابی |

## J

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Jalali** | جلالی/شمسی | تقویم خورشیدی هجری — برای نمایش تاریخ در UI |
| **JWT** | — | JSON Web Token — حامل اطلاعات احراز هویت (نه state ذخیره‌ای) |

## M

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Manager** | مدیر | نقش سیستمی با دسترسی کامل به عملیات، بدون role.manage |
| **Mark Overdue** | علامت‌گذاری معوق | عملیات روزانه که اقساط سررسید گذشته را `overdue` می‌کند |
| **Metadata** | متاداده | ستون `Json?` در همه جداول business برای extensibility بدون migration |
| **Module** | ماژول | مجموعه‌ای از features یک domain: `core`, `installments` |
| **Module Registry** | رجیستری ماژول | سیستمی که ماژول‌ها را در بوتستراپ ثبت می‌کند |
| **Modular Monolith** | یکپارچه ماژولار | یک codebase با مرزهای ماژولار واضح — نه microservice |
| **Multi-tenant** | چند مستأجری | معماری که چندین فروشگاه در یک پایگاه داده با `tenant_id` جدا هستند |

## O

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Optimistic Lock** | قفل خوش‌بینانه | ستون `version` برای جلوگیری از update همزمان متعارض |
| **OTP** | رمز یکبار مصرف | کد ۵ رقمی SMS برای ورود بدون رمز ثابت |
| **Outbox Pattern** | الگوی صندوق پستی | انتشار Domain Event در همان transaction DB — برای consistency |
| **Overdue** | معوق | قسط‌هایی که سررسید گذشته و هنوز پرداخت نشده‌اند |
| **Owner** | صاحب | نقش سیستمی با دسترسی کامل — فقط owner می‌تواند نقش سفارشی بسازد |

## P

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **PaymentAttempt** | تلاش پرداخت | گزارش «پرداخت کردم» توسط مشتری یا staff — در انتظار تأیید |
| **Permission** | مجوز | یک action مشخص که کاربر می‌تواند انجام دهد: `module.resource.action` |
| **Permission Override** | بازنویسی مجوز | grant/deny مجوز مشخص برای یک Staff (استثنا از نقش) |
| **Personal Installment** | قسط شخصی | تعهد مالی که مشتری خودش ثبت می‌کند (مستقل از فروشنده) |
| **Pilot Tenant** | مستأجر آزمایشی | فروشگاه‌های اول که در مرحله beta محصول را آزمایش می‌کنند |
| **Plan** | پلن | بسته اشتراکی با ماژول‌ها و محدودیت‌ها: `starter`, `pro`, `enterprise` |
| **Platform** | پلتفرم | لایه بالایی Hivork — تیم Hivork، PlatformUser، plans |
| **Primary Branch** | شعبه اصلی | شعبه پیش‌فرض یک Staff برای UX (مثل ثبت فروش) |
| **Prisma** | — | ORM TypeScript‌محور برای PostgreSQL — migration به عنوان کد |
| **PWA** | اپ وب پیشرفته | Progressive Web App — مشتری بدون App Store |

## R

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **RBAC** | کنترل دسترسی مبتنی بر نقش | Role-Based Access Control — نقش‌ها، مجوزها، override |
| **Refresh Token** | توکن تازه‌سازی | JWT بلندمدت (۳۰ روز) httpOnly cookie برای دریافت access token جدید |
| **Reminder** | یادآور | پیام خودکار به مشتری قبل یا بعد از سررسید قسط |
| **Reminder Policy** | سیاست یادآور | Runtime object مشتق از settings — چه زمانی، به چه کانالی |
| **Rial** | ریال | واحد ذخیره مالی در DB — همیشه BigInt |
| **RLS** | امنیت سطح ردیف | Row-Level Security PostgreSQL — فاز ۲ defense in depth |
| **Role** | نقش | مجموعه‌ای از permissions — سیستمی یا سفارشی |

## S

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Sale** | فروش | aggregate اصلی ماژول اقساط — شامل همه اقساط |
| **Scheduler** | زمان‌بند | سرویس NestJS که cron و BullMQ workers را اجرا می‌کند |
| **Seed** | بذرافشانی | داده اولیه برای محیط development: پلن‌ها، نقش‌ها، demo tenant |
| **Settings Schema** | قالب تنظیمات | تعریف type، default، و validation هر setting |
| **Slug** | شناسه URL | نام URL-safe یک Tenant: `mobile-store-mashhad` |
| **Soft Delete** | حذف نرم | پنهان‌سازی رکورد با `deletedAt` — داده در DB باقی می‌ماند |
| **Staff** | عضو تیم | کارمند یا صاحب فروشگاه — actor داخلی Tenant |
| **State Machine** | ماشین حالت | مجموعه وضعیت‌ها و انتقال‌های مجاز یک entity |

## T

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Tenant** | مستأجر / فروشگاه | یک کسب‌وکار در Hivork — customer اشتراک SaaS |
| **TenantCustomer** | مشتری فروشگاه | رابطه بین یک Tenant و یک GlobalCustomer |
| **Toman** | تومان | واحد نمایش در UI = ریال تقسیم بر ۱۰ |
| **Turborepo** | — | ابزار build ورزشکار در monorepo — cache هوشمند |

## U

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **User** | کاربر platform | هویت مشترک platform — `phone` unique؛ Staff و GlobalCustomer به آن FK (ADR-017) |
| **Use Case** | کاربرد / مورد استفاده | کلاس در `packages/application/` که یک عملیات business را orchestrate می‌کند |
| **UUID** | شناسه یکتا | شناسه منحصربه‌فرد جهانی — فرمت `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

## V

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Value Object** | شیء مقدار | شیء domain بدون هویت — مثل Money، PhoneNumber |
| **Version** | نسخه | ستون `Int` برای optimistic locking — با هر update افزایش می‌یابد |
| **Vertical Slice** | برش عمودی | feature کامل از DB تا UI — برای تست end-to-end |
| **Viewer** | مشاهده‌گر | نقش سیستمی فقط خواندن |

## W

| انگلیسی | فارسی | توضیح |
|---------|--------|--------|
| **Waive** | بخشودگی قسط | تغییر وضعیت قسط به `waived` توسط staff با permission — بدون حذف |
| **Webhook** | — | endpoint HTTP که پیام‌های ربات را دریافت می‌کند |

---

## اصطلاحات مالی مهم

| اصطلاح فارسی | اصطلاح انگلیسی | توضیح |
|--------------|----------------|--------|
| **فروش قسطی** | Installment Sale | فروش با تقسیم مبلغ به اقساط |
| **پیش‌پرداخت** | Down Payment | مبلغ اول که نقد پرداخت می‌شود |
| **سررسید** | Due Date | تاریخ اجباری پرداخت قسط |
| **معوقات** | Overdue | اقساطی که سررسید گذشته و پرداخت نشده‌اند |
| **تقویم اقساط** | Installment Calendar | نمایش Jalali همه سررسیدها |
| **جریان نقدی** | Cashflow | مجموع ورودی پیش‌بینی‌شده از اقساط |

---

## Convention‌های کد

| مفهوم | در کد |
|-------|--------|
| مبلغ پول | `amountRial: bigint` |
| تاریخ | `dueDate: DateTime` (UTC در DB، تهران در logic) |
| soft delete | `deletedAt`, `deletedById`, `deleteReason?` |
| base fields | `id, createdAt, updatedAt, createdById, updatedById, version, metadata` |
| permission | `module.resource.action` (نقطه‌گذاری) |
| event name | `PascalCase` گذشته: `PaymentConfirmed` |

---

*نسخه 1.0 — 1405/04/08*
