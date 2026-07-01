# IFP-TASK-044: Customer File Gallery UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-04-Customer-Documents |
| ID | IFP-044 |
| Priority | P0 |
| Depends on | IFP-043, **IFP-019** (DataTable/file components from Phase 02) |
| Blocks | IFP-053 |
| Estimated | 6h |

---

## هدف

**Gallery UI** فایل‌های مشتری — grid تصاویر، PDF icon، preview modal، upload، delete — tab «مدارک» در detail مشتری. وابسته به **IFP-019** برای shared upload/FilePreview components.

---

## معیار پذیرش

- [ ] Component `CustomerDocumentGallery` in customer detail tab
- [ ] Grid responsive — 2 col mobile, 4 desktop
- [ ] Filter by documentType chips
- [ ] Image preview lightbox — pinch zoom mobile
- [ ] PDF open in new tab via signed URL
- [ ] Upload uses IFP-043 API — drag-drop + file picker
- [ ] Delete with confirm — permission hide button
- [ ] States: loading skeleton, empty CTA upload, error retry, no-permission message
- [ ] RTL layout — labels fa
- [ ] a11y: keyboard nav lightbox

---

## مشخصات فنی

### Route integration

`/admin/customers/[id]` — tab `documents`

### Props / data

Fetch GET documents on tab activate  
Invalidate on upload/delete  

### Document type labels (fa)

| Type | Label |
|------|-------|
| national_id | کارت ملی |
| birth_certificate | شناسنامه |
| contract | قرارداد |
| photo | تصویر |
| other | سایر |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(admin)/customers/[id]/components/customer-document-gallery.tsx` |
| Create | `apps/web/app/(admin)/customers/[id]/components/document-upload-zone.tsx` |
| Create | `apps/web/lib/api/customer-documents.ts` |
| Update | customer detail page tabs IFP-053 |

---

## مراحل پیاده‌سازی

1. API client hooks
2. Gallery grid + type filter
3. Upload zone with progress
4. Lightbox component
5. Permission gates
6. All page states
7. Storybook optional

---

## Edge Cases & Errors

| سناریو | UI behavior |
|--------|-------------|
| Upload fail | toast + keep file selected |
| Expired signed URL | refresh on 403 |
| Empty gallery | illustration + upload CTA |
| No permission | read-only message |

---

## تست

- [ ] E2E: upload image → visible in grid
- [ ] E2E: delete removes from grid
- [ ] Visual: RTL snapshot optional

---

## UX

- [ ] Excellence §5 form — upload description optional
- [ ] Excellence §7 — loading, empty, error, no-permission
- [ ] Mobile file input accept attribute
- [ ] Help text max size/types

---

## Flow

```
Entry: detail → tab مدارک
Load documents → skeleton
Empty → upload CTA
Click image → lightbox
Upload new → progress → grid refresh
Delete → confirm → remove
Exit: stay on tab
```

---

## Policy Alignment

- [ ] Permission UI only — backend authoritative
- [ ] EXCELLENCE §7 all states
- [ ] IFP-019 shared components

---

## مراجع

- `InstallmentFeaturePhases/Phase-02-CrossCutting-UI/` — IFP-019
- IFP-043 API

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
