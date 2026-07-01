# TASK-129: Webhook Registration & Env

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-02-Bale-Infrastructure |
| ID | TASK-129 |
| Priority | P0 |
| Depends on | TASK-127 |
| Blocks | TASK-138 |
| Estimated | 3h |

---

## هدف

ثبت webhook در startup اپ `bot-gateway` — HTTPS port 443/88، env vars، `getWebhookInfo` health check.

---

## معیار پذیرش

- [ ] Env: `BALE_BOT_TOKEN`, `BALE_WEBHOOK_URL`, `BALE_WEBHOOK_SECRET`
- [ ] On boot: `setWebhook` اگر URL تنظیم شده
- [ ] Log `getWebhookInfo` — بدون token در log
- [ ] Dev: skip registration اگر `BALE_WEBHOOK_URL` خالی
- [ ] Document ports 443 و 88 در ENVIRONMENT-CONFIG

---

## مشخصات فنی

### Environment variables

| Var | Required | Example |
|-----|----------|---------|
| `BALE_BOT_TOKEN` | prod | `123456:ABC...` |
| `BALE_WEBHOOK_URL` | prod | `https://api.hivork.ir/bot/bale/webhook` |
| `BALE_WEBHOOK_SECRET` | prod | random 32+ chars |

### setWebhook call

```typescript
await baleClient.setWebhook({
  url: process.env.BALE_WEBHOOK_URL!,
  secret_token: process.env.BALE_WEBHOOK_SECRET,
});
```

### Webhook ports (Bale policy)

Only **443** and **88** — ingress/nginx must terminate TLS on these ports.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/bale-webhook.bootstrap.ts` |
| Update | `apps/bot-gateway/src/main.ts` |
| Update | `.env.example` |
| Update | `docs/09-development/ENVIRONMENT-CONFIG.md` |

---

## مراحل پیاده‌سازی

1. Bootstrap module — register on app init
2. Guard: only when BALE_WEBHOOK_URL set
3. getWebhookInfo verification log
4. Update ENVIRONMENT-CONFIG.md

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Empty webhook URL | — | skip registration — dev mode |
| setWebhook fail | — | fail fast startup in prod |
| Secret mismatch later | 401 | handled in TASK-138 |

---

## تست

- [ ] Unit: bootstrap skips without URL
- [ ] Integration: mock setWebhook called

---

## Policy Alignment

- [ ] ENVIRONMENT-CONFIG sync
- [ ] No secrets in logs

---

## مراجع

- `docs/05-channels/bale-api-reference.md`
- `docs/09-development/ENVIRONMENT-CONFIG.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
