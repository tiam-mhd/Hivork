# IFP-TASK-045: Location/Geo on Customer Address

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-04-Customer-Documents |
| ID | IFP-045 |
| Priority | P1 |
| Depends on | IFP-033, IFP-037 |
| Blocks | IFP-053 |
| Estimated | 5h |

---

## هدف

**لوکیشن/geo** روی آدرس مشتری — latitude/longitude capture via map picker یا manual entry، validation bounds ایران، نمایش pin در detail — §۳ آدرس/لوکیشن.

---

## معیار پذیرش

- [ ] Address fields latitude/longitude persisted (IFP-033 schema)
- [ ] PATCH address supports lat/lng update via customer update or dedicated sub-resource
- [ ] Validation: lat 25–40, lng 44–64 approximate Iran bounding box
- [ ] Optional reverse geocode stub — city/province suggest (P2 external API)
- [ ] Map component in address form — OpenStreetMap/Leaflet or Mapbox tenant key
- [ ] «استفاده از موقعیت فعلی» browser geolocation — HTTPS only
- [ ] Clear location button

---

## مشخصات فنی

### API

Included in nested `addresses[]` on create/update (IFP-036/037) — no separate endpoint required unless PATCH `/addresses/:id` added for ergonomics

### Map defaults

Center: Tehran 35.6892, 51.3890  
Zoom: 12 when editing existing pin  

### Privacy

Geolocation consent banner fa  
Do not log exact coords in application logs

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/components/maps/address-map-picker.tsx` |
| Update | customer address form in IFP-053 |
| Update | validation in update use case |

---

## مراحل پیاده‌سازی

1. Domain validation lat/lng bounds
2. Map picker component RTL
3. Integrate in address repeater form
4. Display read-only mini map on detail
5. Unit test bounds validation

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Geolocation denied | manual pin only |
| Coords outside Iran | 422 warning or allow with confirm |
| No coords | address text-only valid |
| Mobile touch drag pin | supported |

---

## تست

- [ ] Unit: bounds validation
- [ ] Integration: save address with lat/lng
- [ ] Manual: map picker sets fields

---

## UX

- [ ] Excellence §5 — help text for location optional
- [ ] Map loads skeleton
- [ ] Error geolocation permission fa message

---

## Flow

```
Entry: edit customer → addresses
Expand address → map below fields
Drag pin OR use current location
Save with customer form
Detail view: static map thumbnail if coords set
```

---

## Policy Alignment

- [ ] PII — coords sensitive — no public exposure
- [ ] Customer PWA does not show staff internal map unless product says otherwise

---

## مراجع

- `docs/01-product/installment-module-features.md` §۳ — لوکیشن

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 24 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **99** |
