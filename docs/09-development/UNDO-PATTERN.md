# Undo Pattern (Hivork Admin)

Cross-cutting undo infrastructure for reversible staff actions. Domain modules register **server-side** reverse handlers — never optimistic-only undo for financial data.

## Web API

```typescript
import { useUndoManager } from '@/hooks/use-undo-manager';

const { offerUndo } = useUndoManager();

await api.doSomething();
offerUndo({
  message: 'عملیات انجام شد',
  onUndo: () => api.reverseSomething(), // must call API
  metadata: { action: 'resource.action', entityIds: ['…'] },
});
```

- **Window:** `NEXT_PUBLIC_UNDO_WINDOW_MS` (default `10000`)
- **Stack:** one active undo; new `offerUndo` replaces the previous toast
- **UI:** `UndoToast` bottom-start — message, «بازگردانی», optional countdown

## Server contract

Each reversible action exposes a dedicated reverse endpoint, for example:

- `POST /api/v1/customers/bulk-untag` with `{ ids, tag, isUndo?: true, originalAction?: string }`
- Future financial flows: `POST /api/v1/payments/:id/unconfirm` with **`Idempotency-Key`** header

Rules:

1. Undo always hits the API (same permission as original action unless documented otherwise).
2. Financial reverse must be idempotent and audited.
3. Log audit `undo.executed` with `entityType` = original action and `old_value.originalEntityIds`.

## Audit example

```json
{
  "action": "undo.executed",
  "entityType": "customer.bulk_tag",
  "old_value": { "originalEntityIds": ["…"], "tag": "bulk-demo" }
}
```

## Demo integration

Customer list bulk tag (`bulk-demo` tag) calls `POST /customers/bulk-tag` then offers undo via `POST /customers/bulk-untag` with `isUndo: true`.

## Keyboard shortcuts

See `useKeyboardShortcut` + `KeyboardShortcutsProvider`. List pages register `/` (search) and `Ctrl+Shift+E` (export) via `DataTable` props.

## References

- IFP-TASK-032
- `docs/06-operations/security-and-audit.md`
- `docs/09-development/DEVELOPMENT_RULES.md`
