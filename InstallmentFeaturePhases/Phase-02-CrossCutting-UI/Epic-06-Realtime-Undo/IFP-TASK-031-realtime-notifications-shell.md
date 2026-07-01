# IFP-TASK-031: Real-Time Notifications Shell (SSE/WebSocket)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-06-Realtime-Undo |
| ID | IFP-TASK-031 |
| Priority | P1 |
| Depends on | IFP-TASK-018, TASK-101 |
| Blocks | IFP-TASK-032, IFP Phase 08 Notifications |
| Estimated | 12h |

---

## هدف

**Shell اعلان لحظه‌ای** در admin — اتصال SSE (پیش‌فرض) یا WebSocket به channel tenant+staff — نمایش toast و badge در header. این task زیرساخت transport و UI را می‌سازد؛ payloadهای دامنه‌ای (پرداخت جدید، یادآور) در فازهای بعد publish می‌شوند.

---

## معیار پذیرش

- [ ] Transport: **SSE** `GET /api/v1/realtime/stream` — auth via cookie/JWT
- [ ] Fallback: WebSocket `/api/v1/realtime/ws` اگر SSE blocked (document proxy rules)
- [ ] Channel scope: `tenant:{tenantId}:staff:{staffId}` — no cross-tenant leak
- [ ] Event envelope Zod schema — `type`, `payload`, `timestamp`, `id`
- [ ] `RealtimeProvider` React context — connection state, lastEvent
- [ ] Header `NotificationBell` — unread count badge
- [ ] `NotificationPanel` dropdown — list last 20 in-memory + link to full page later
- [ ] Toast on high-priority events (`priority: 'high'`)
- [ ] Reconnect exponential backoff 1s→30s max
- [ ] Heartbeat every 30s — disconnect detection
- [ ] Redis pub/sub backend bridge — `RealtimePublisher` port
- [ ] Rate limit: 1 connection per staff session
- [ ] Graceful degrade: polling `GET /api/v1/notifications/unread-count` every 60s if stream fails

---

## مشخصات فنی

### Event Envelope

```typescript
// packages/contracts/src/realtime/realtime-event.schema.ts
export const RealtimeEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(), // e.g. 'payment.reported', 'system.announcement'
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
```

### SSE Endpoint

```http
GET /api/v1/realtime/stream
Authorization: Bearer ... (or hivork_staff cookie)
Accept: text/event-stream

→ stream:
event: message
data: {"id":"...","type":"system.ping","payload":{},"createdAt":"..."}

: heartbeat
```

```typescript
@Get('stream')
@RequireAuth()
@Sse()
stream(@Ctx() ctx: StaffContext): Observable<MessageEvent> {
  return this.realtimeService.subscribe(ctx.tenantId, ctx.staffId);
}
```

### Redis Pub/Sub

```typescript
// packages/application/core/realtime/realtime-publisher.ts
export interface RealtimePublisher {
  publish(tenantId: string, staffId: string, event: RealtimeEvent): Promise<void>;
  publishToTenant(tenantId: string, event: RealtimeEvent): Promise<void>; // managers only filter client-side
}
```

Channel key: `realtime:tenant:{tenantId}:staff:{staffId}`

### Frontend Provider

```
apps/web/src/providers/realtime-provider.tsx
apps/web/src/hooks/use-realtime.ts
```

```typescript
export function useRealtime() {
  return {
    status: 'connecting' | 'connected' | 'disconnected',
    subscribe: (type: string, handler: (e: RealtimeEvent) => void) => unsubscribe,
  };
}
```

### NotificationBell UI

```
apps/web/src/components/layout/notification-bell.tsx
```

- Badge count from local queue (increment on event `read: false`)
- Mark all read on panel open
- Event types map to fa titles (config object)

### Dev Test Event

```http
POST /api/v1/dev/realtime/ping  (dev only)
→ pushes test event to current staff
```

### Security

- JWT validated before stream open
- Staff inactive → 403 close connection
- Tenant suspended → 403 + event `tenant.suspended`
- No PII in payload titles — use entity ids + client fetch detail

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/realtime/realtime-event.schema.ts` |
| Create | `packages/application/core/realtime/realtime.service.ts` |
| Create | `packages/application/core/realtime/realtime-publisher.redis.ts` |
| Create | `apps/api/src/modules/core/realtime/realtime.controller.ts` |
| Create | `apps/web/src/providers/realtime-provider.tsx` |
| Create | `apps/web/src/components/layout/notification-bell.tsx` |
| Create | `apps/web/src/components/layout/notification-panel.tsx` |
| Update | `apps/web/src/app/(admin)/layout.tsx` — providers |

---

## مراحل پیاده‌سازی

1. Event schema + publisher port
2. Redis pub/sub adapter
3. SSE controller + NestJS Observable
4. RealtimeProvider client + EventSource
5. Reconnect + heartbeat handling
6. NotificationBell + panel UI
7. Toast bridge for high priority
8. Polling fallback
9. Dev ping endpoint
10. Integration test: publish → SSE receives

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| SSE proxy timeout | Reconnect + heartbeat |
| Token expired mid-stream | 401 → refresh token → reconnect |
| Duplicate event id | Dedupe client-side Set |
| Tab background throttling | catch up on focus via poll |
| Multiple tabs | Each connection OK; badge sync via BroadcastChannel optional |

---

## تست

- [ ] Integration: SSE auth deny without token
- [ ] Integration: publish event received by subscriber
- [ ] Integration: cross-tenant channel isolation
- [ ] Unit: exponential backoff delays
- [ ] Component: bell badge increments

---

## UX

- [ ] Connection status dot (dev/debug optional)
- [ ] Empty panel: «اعلان جدیدی ندارید»
- [ ] Sound optional off by default
- [ ] RTL panel layout

---

## Flow

```
Admin layout mount → RealtimeProvider connects SSE
  → events arrive → queue → bell badge++
  → high priority → toast
  → user opens panel → mark read
Disconnect → backoff reconnect → fallback poll
```

---

## Policy Alignment

- [ ] ADR-004 — auth on stream
- [ ] No PII in realtime payload
- [ ] Structured logging connection events

---

## مراجع

- `docs/01-product/installment-module-features.md` — اعلان‌های لحظه‌ای
- IFP Phase 08 — notification payloads
- `docs/06-operations/security-and-audit.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | P1 |
| Completeness | /25 | 25 | |
| Policy | /25 | 24 | |
| Executability | /25 | 25 | |
| Alignment | /15 | 14 | Phase 08 hook |
| **جمع** | **/100** | **98** | ≥95 ✅ |
