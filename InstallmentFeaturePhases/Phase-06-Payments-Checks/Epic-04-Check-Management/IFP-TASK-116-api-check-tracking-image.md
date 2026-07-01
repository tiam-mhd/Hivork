# IFP-TASK-116: API — پیگیری چک و تصویر

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-04-Check-Management |
| ID | IFP-TASK-116 |
| Priority | P0 |
| Depends on | IFP-TASK-115 |
| Blocks | IFP-TASK-117, IFP-TASK-118 |
| Estimated | 5h |

---

## هدف

API **پیگیری وضعیت چک** (timeline + bank follow-up notes) و **آپلود/دانلود تصویر چک** — لینک به File service.

---

## معیار پذیرش

- [ ] `GET /api/v1/checks/{id}/tracking` — timeline events
- [ ] `POST /api/v1/checks/{id}/tracking-notes` — staff follow-up note
- [ ] `POST /api/v1/checks/{id}/image` — upload scan (multipart)
- [ ] `GET /api/v1/checks/{id}/image` — signed URL
- [ ] Permission: `installments.check.read`, `installments.check.update`
- [ ] `CheckTrackingEvent` append-only or AuditLog derived
- [ ] imageFileId on Check model updated
- [ ] Integration tests

---

## مشخصات فنی

### Tracking response

```json
{
  "checkId": "uuid",
  "timeline": [
    { "at": "...", "action": "check.register", "actorStaffId": "...", "note": null },
    { "at": "...", "action": "check.due", "note": "سررسید" },
    { "at": "...", "action": "check.collect", "actorStaffId": "..." }
  ],
  "followUpNotes": [
    { "id": "uuid", "body": "تماس با بانک", "createdAt": "...", "createdById": "..." }
  ]
}
```

### Upload image

```
POST /api/v1/checks/{checkId}/image
Content-Type: multipart/form-data
Permission: installments.check.update
Max size: 5MB — jpeg/png/pdf
```

Stores via `StoredFile` stub (full File service IFP-172+) — tenant-scoped path `checks/{checkId}/scan`.

### Bank tracking fields

Optional on Check: `bankTrackingCode`, `depositSlipNumber` — updatable via PATCH with audit.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/get-check-tracking.use-case.ts` |
| Create | `packages/application/payments/add-check-tracking-note.use-case.ts` |
| Create | `packages/application/payments/upload-check-image.use-case.ts` |
| Create | `packages/infrastructure/storage/check-image.adapter.ts` |
| Update | `apps/api/src/modules/payments/checks.controller.ts` |

---

## مراحل پیاده‌سازی

1. Timeline from AuditLog filter entity=check
2. CheckTrackingNote model (or CustomerNote pattern)
3. Image upload adapter (local/S3 config)
4. Controller endpoints
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Upload wrong mime | 400 | `INVALID_FILE_TYPE` |
| File too large | 413 | `FILE_TOO_LARGE` |
| Check soft-deleted | 404 | not found |
| Cross-tenant check id | 404 | |

---

## تست

- [ ] Integration: tracking timeline after lifecycle
- [ ] Integration: upload + get signed URL
- [ ] RBAC read without update on upload

---

## UX

IFP-117 — tab «پیگیری» + drag-drop image upload.

---

## Flow

```
جزئیات چک → پیگیری → timeline
           → آپلود تصویر → preview
           → یادداشت پیگیری → audit
```

---

## Policy Alignment

- [ ] No PII in logs
- [ ] Tenant scope on files
- [ ] SOFT-DELETE on Check

---

## مراجع

- `docs/01-product/installment-module-features.md` §۷ — تصویر، بانک، پیگیری
- IFP-TASK-115, IFP-TASK-172 (file service)

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
