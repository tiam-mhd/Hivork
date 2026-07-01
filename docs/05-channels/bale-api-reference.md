# مرجع API بازوی بله — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/09  
> **منبع رسمی:** [مستندات بازوی بله](https://docs.bale.ai/) · [صفحه توسعه‌دهندگان](https://bale.ai/dev)  
> **ADR مرتبط:** ADR-006, ADR-018 (پیشنهادی — Channel Abstraction)

---

## خلاصه برای Hivork

| موضوع | مقدار |
|--------|--------|
| Base URL API | `https://tapi.bale.ai/bot{token}/` |
| سازگاری | API بر پایه Bot API تلگرام با تفاوت‌های جزئی |
| دریافت آپدیت (prod) | **Webhook** — `setWebhook` |
| پورت‌های webhook | **443** و **88** فقط |
| ساخت بازو | گفتگو با `@botfather` در بله |
| Deep link مشتری | `https://ble.ir/{BotUsername}?start=link_{token}` |
| کتابخانه پیشنهادی | grammY با `apiRoot: 'https://tapi.bale.ai'` |

---

## ساخت بازو و احراز هویت

1. در اپلیکیشن بله با `@botfather` گفتگو کنید و بازو بسازید.
2. توکن با فرمت `123456789:abcdIuZmK5qNEm2A1BhUaAg7MPJv1O9KCcBQB2ro` دریافت می‌شود.
3. تمام درخواست‌ها **HTTPS** به شکل زیر:

```
GET|POST https://tapi.bale.ai/bot<token>/<METHOD_NAME>
```

### فرمت پاسخ (همه متدها)

```json
{
  "ok": true,
  "result": { }
}
```

| فیلد | نوع | توضیح |
|------|-----|--------|
| `ok` | boolean | موفقیت درخواست |
| `result` | object | خروجی در صورت `ok: true` |
| `description` | string | توضیح خطا/موفقیت |
| `error_code` | integer | کد خطا در صورت `ok: false` |
| `parameters` | ResponseParameters | اختیاری — مثلاً `retry_after` برای rate limit |

**نکات:**
- Case-insensitive برای نام متدها
- UTF-8 اجباری
- پارامترها: query string، `application/x-www-form-urlencoded`، `application/json` (غیر از upload)، `multipart/form-data` (upload)

---

## دریافت آپدیت‌ها

### روش‌های مجاز

| روش | استفاده در Hivork |
|-----|-------------------|
| `getUpdates` (long polling) | فقط dev/local |
| `setWebhook` | **production** |

- حداکثر **۲۰۰۰** آپدیت آخر به مدت **۲۴ ساعت** نگهداری می‌شود.
- `update_id` برای deduplication — offset = آخرین `update_id + 1`.

### setWebhook

```
POST https://tapi.bale.ai/bot<token>/setWebhook
```

| پارامتر | نوع | الزام | توضیح |
|---------|-----|--------|--------|
| `url` | String | بله | URL HTTPS؛ رشته خالی = غیرفعال |

### deleteWebhook / getWebhookInfo

- `deleteWebhook` — بازگشت به polling
- `getWebhookInfo` — شی `WebhookInfo` با فیلد `url`

### Update (ورودی webhook)

حداکثر **یکی** از فیلدهای زیر در هر آپدیت:

| فیلد | نوع | Hivork |
|------|-----|--------|
| `update_id` | Integer | dedup در Redis |
| `message` | Message | دستورات `/start`, `/installments` |
| `edited_message` | Message | ignore در v1 |
| `callback_query` | CallbackQuery | دکمه‌های inline |
| `pre_checkout_query` | PreCheckoutQuery | **خارج از scope** فاز ۴ |

---

## انواع داده — کلیدی برای Hivork

### User

| فیلد | نکته Hivork |
|------|-------------|
| `id` | **Integer** — ممکن است > 2³¹؛ ذخیره به صورت `string` در DB |
| `is_bot` | boolean |
| `first_name` | string |
| `username` | اختیاری |

### Message (متن)

| فیلد | نکته |
|------|------|
| `message_id` | integer |
| `from` | User |
| `chat` | Chat — `chat.id` = مقصد `sendMessage` |
| `text` | دستور `/start link_xxx` |
| `reply_markup` | InlineKeyboard |

### CallbackQuery

| فیلد | نکته |
|------|------|
| `id` | برای `answerCallbackQuery` |
| `from` | User |
| `data` | ۱–۶۴ بایت — `pay:{installmentId}` |
| `message` | پیام مبدأ دکمه |

**اجباری:** پس از هر کلیک inline، `answerCallbackQuery` فراخوانی شود (حتی بدون `text`).

**سازگاری کلاینت:** اگر `callback_query_id` با `1` شروع شود → کلاینت قدیمی؛ بازخورد را با `sendMessage` بدهید.

### InlineKeyboardButton

| فیلد | Hivork |
|------|--------|
| `text` | برچسب فارسی |
| `callback_data` | `installments:page:1`, `pay:uuid` |
| `url` | deep link PWA یا `ble.ir` |

فقط **یکی** از فیلدهای اختیاری (`url`, `callback_data`, `web_app`, `copy_text`).

---

## متدهای API — استفاده‌شده در Hivork

### getMe

تست توکن — health check startup.

### sendMessage

```
POST .../sendMessage
```

| پارامتر | الزام | توضیح |
|---------|--------|--------|
| `chat_id` | بله | Integer یا String — `BotIdentity.externalId` |
| `text` | بله | ۱–۴۰۹۶ کاراکتر؛ **Markdown** پیش‌فرض |
| `reply_markup` | خیر | InlineKeyboardMarkup |

**قالب Markdown بله:**
- **برجسته:** ` * متن * ` (فاصله قبل/بعد ستاره)
- _ایتالیک:_ ` _ متن _ `
- لینک: `[متن](url)`
- پیش‌نمایش لینک: ` ```[متن]توضیح``` `

### answerCallbackQuery

| پارامتر | الزام | توضیح |
|---------|--------|--------|
| `callback_query_id` | بله | از CallbackQuery.id |
| `text` | خیر | ۰–۲۰۰ کاراکتر |
| `show_alert` | خیر | true = alert modal |

### forwardMessage / copyMessage / sendPhoto / ...

خارج از scope یادآور فاز ۴ — فقط `sendMessage` + inline keyboard.

---

## محدودیت نرخ (Rate Limits)

منبع: [bale.ai/dev](https://bale.ai/dev)

| محدودیت | مقدار |
|---------|--------|
| پیام سراسری | ~**۲۰ پیام/ثانیه** |
| پیام به یک گفتگو | ~**۱۲۰ پیام/دقیقه** |
| عبور از حد | HTTP **429** + `parameters.retry_after` (ثانیه) |

**سیاست Hivork:**
- Queue + backoff در `BaleNotificationAdapter`
- Batch یادآورها با فاصله ≥ 50ms بین send
- Dead letter پس از ۴ تلاش (مطابق `notifications.md`)

---

## Webhook — پیاده‌سازی Hivork

```
POST https://{domain}/webhooks/bale
Header: X-Telegram-Bot-Api-Secret-Token: {BALE_WEBHOOK_SECRET}
Body: Update JSON
```

> بله از همان header name تلگرام پشتیبانی می‌کند (سازگاری API).

**پاسخ:** HTTP 200 سریع — پردازش async در worker اگر latency > 2s.

---

## Deep Links

```
https://ble.ir/HivorkBot?start=link_{oneTimeToken}
```

- `start` payload حداکثر ۶۴ کاراکتر (محدودیت Bot API)
- Token یکبارمصرف در Redis — TTL ۷۲ ساعت

---

## متدهای خارج از scope فاز ۴

| متد | دلیل |
|-----|------|
| `askReview` | بازاریابی — فاز بعد |
| `pre_checkout_query` | پرداخت درون‌بله — ADR جدا |
| Safir API (`safir.bale.ai`) | پیام سازمانی با Api Access Key — فاز ۶ SMS جایگزین |
| Mini App (`web_app`) | PWA جدا — لینک `url` کافی است |

---

## سرویس سفیر (Safir) — مرجع

> منبع: [docs.bale.ai/safir](https://docs.bale.ai/safir)

REST جدا برای ارسال پیام با `api-access-key` — **در فاز ۴ استفاده نمی‌شود** (نیاز به پنل کسب‌وکار بله). یادآورها via `sendMessage` به `chat_id` لینک‌شده.

---

## Environment Variables (Hivork)

```env
BALE_BOT_TOKEN=
BALE_BOT_USERNAME=HivorkBot
BALE_WEBHOOK_SECRET=
BALE_API_BASE_URL=https://tapi.bale.ai
BOT_GATEWAY_PUBLIC_URL=https://bot.hivork.ir
```

---

## مراجع رسمی

| سند | URL |
|-----|-----|
| مستندات کامل API | https://docs.bale.ai/ |
| توسعه‌دهندگان | https://bale.ai/dev |
| سفیر (ارسال سازمانی) | https://docs.bale.ai/safir |

---

*استخراج از مستندات رسمی بله — 1405/04/09. هر تغییر API → به‌روزرسانی این سند قبل از پیاده‌سازی.*
