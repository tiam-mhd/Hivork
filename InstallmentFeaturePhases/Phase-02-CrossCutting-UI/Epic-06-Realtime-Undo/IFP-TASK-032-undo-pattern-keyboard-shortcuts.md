# IFP-TASK-032: Undo Pattern + Keyboard Shortcuts Registry

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-06-Realtime-Undo |
| ID | IFP-TASK-032 |
| Priority | P1 |
| Depends on | IFP-TASK-019, IFP-TASK-031 |
| Blocks | — (domain phases register handlers) |
| Estimated | 10h |

---

## هدف

الگوی **Undo** برای عملیات مهم — toast با دکمه «بازگردانی» و window زمانی configurable — و **registry میانبرهای صفحه‌کلید** سراسری با modal راهنما (`?`). عملیات مالی handler خود را در فاز دامنه register می‌کنند؛ این task فقط infrastructure است.

---

## معیار پذیرش

- [ ] `UndoManager` context — `registerUndo`, `executeUndo`, `dismissUndo`
- [ ] `UndoToast` — نمایش `{message}` + «بازگردانی» + countdown optional
- [ ] Default undo window: **10 seconds** — env `UNDO_WINDOW_MS`
- [ ] Undo **همیشه** server call — `onUndo: () => Promise<void>` — no optimistic-only financial undo
- [ ] `KeyboardShortcutsRegistry` — scoped: `global`, `list`, `detail`
- [ ] `useKeyboardShortcut(key, handler, { when, scope })`
- [ ] Global shortcuts baseline:
  - `?` — open shortcuts help modal
  - `/` — focus search (when not in input)
  - `Escape` — close modal/drawer (existing behavior unified)
  - `g then c` — go customers (vim-style optional P1)
- [ ] Shortcuts help modal — searchable table fa labels
- [ ] Prevent shortcuts when `input/textarea/contenteditable` focused
- [ ] Audit: `undo.executed` with original action reference
- [ ] Integration example: stub `customer.bulkTag` undo (non-financial demo)

---

## مشخصات فنی

### UndoManager API

```typescript
// apps/web/src/lib/undo/undo-manager.tsx
interface UndoEntry {
  id: string;
  message: string;
  expiresAt: number;
  onUndo: () => Promise<void>;
  metadata?: { action: string; entityIds?: string[] };
}

interface UndoManager {
  offerUndo(entry: Omit<UndoEntry, 'id' | 'expiresAt'>): void;
  dismissUndo(id: string): void;
}
```

### Offer Undo After Action

```typescript
// consumer pattern (domain phase)
await api.customers.bulkTag({ ids, tagId });
undoManager.offerUndo({
  message: `برچسب به ${ids.length} مشتری اضافه شد`,
  onUndo: () => api.customers.bulkUntag({ ids, tagId }),
  metadata: { action: 'customer.bulk_tag', entityIds: ids },
});
```

### UndoToast UI

```
apps/web/src/components/undo/undo-toast.tsx
```

```
┌────────────────────────────────────────────┐
│ برچسب اضافه شد.  [بازگردانی]  (۸ ثانیه) │
└────────────────────────────────────────────┘
```

- Stack max 1 undo at a time — new replaces old with dismiss
- Loading on undo button
- Success/error toast after undo completes

### Server-Side Undo Contract (document for domain teams)

```typescript
// Each reversible action should expose:
// POST /api/v1/{resource}/actions/{actionId}/undo
// OR dedicated reverse endpoint e.g. POST /payments/:id/unconfirm
// Idempotency-Key required for financial undo
```

Financial undo examples deferred to Phase 05–06 with regression tests.

### Keyboard Shortcuts Registry

```typescript
// apps/web/src/lib/keyboard/shortcuts-registry.ts
export interface ShortcutDefinition {
  id: string;
  keys: string; // display "Ctrl+S" | "/"
  description: string; // fa
  descriptionEn?: string;
  scope: 'global' | 'list' | 'detail' | 'modal';
  handler: () => void;
  when?: () => boolean;
}
```

```typescript
export function registerShortcut(def: ShortcutDefinition): () => void;
export function getShortcutsForScope(scope: string): ShortcutDefinition[];
```

### useKeyboardShortcut Hook

```typescript
useKeyboardShortcut('/', () => focusSearch(), {
  scope: 'list',
  when: () => !isInputFocused(),
});
```

Uses `keydown` listener at document level with capture — respects registry order.

### Shortcuts Help Modal

```
apps/web/src/components/keyboard/shortcuts-help-modal.tsx
```

Triggered by `?` (Shift+/ on some keyboards).

| میانبر | عمل |
|--------|-----|
| `/` | فOCUS جستجو |
| `?` | نمایش راهنما |
| `Esc` | بستن پنجره |

### DataTable List Shortcuts (register in IFP-TASK-019 integration)

| Key | Action |
|-----|--------|
| `/` | Focus SearchInput |
| `Ctrl+Shift+E` | Export (if permitted) |

### Audit (backend when undo executes)

```typescript
{
  action: 'undo.executed',
  entity: metadata.action,
  old_value: { originalEntityIds },
  tenant_id,
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/lib/undo/undo-manager.tsx` |
| Create | `apps/web/src/components/undo/undo-toast.tsx` |
| Create | `apps/web/src/lib/keyboard/shortcuts-registry.ts` |
| Create | `apps/web/src/hooks/use-keyboard-shortcut.ts` |
| Create | `apps/web/src/components/keyboard/shortcuts-help-modal.tsx` |
| Update | `apps/web/src/app/(admin)/layout.tsx` — UndoProvider, shortcuts init |
| Update | `apps/web/src/components/data-table/data-table.tsx` — register list shortcuts |
| Create | `docs/09-development/UNDO-PATTERN.md` |

---

## مراحل پیاده‌سازی

1. UndoManager context + toast UI
2. Timer dismiss + undo execution
3. Shortcuts registry + hook
4. Input focus guard
5. Help modal + `?` binding
6. Wire `/` to SearchInput in customer list POC
7. Document UNDO-PATTERN.md for domain teams
8. Stub bulk tag undo demo
9. Audit contract documentation

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Undo after window expired | Button hidden; API reject if called |
| Undo API fail | Toast error «بازگردانی ممکن نبود» |
| Double undo click | Disable button during request |
| Shortcut in input field | Ignored |
| Conflicting shortcuts | Last registered wins — document in registry |
| Mac Meta vs Ctrl | Display «⌘» where applicable |

---

## تست

- [ ] Unit: undo expires after window
- [ ] Component: undo calls onUndo once
- [ ] Component: shortcut ignored when input focused
- [ ] Component: help modal lists registered shortcuts
- [ ] Integration: undo API called + audit (mock)

---

## UX

- [ ] Undo toast not blocking — bottom-start stack
- [ ] fa messages
- [ ] a11y: undo button keyboard accessible
- [ ] Help modal RTL table

---

## Flow

```
Action success → offerUndo → toast visible
  ├─ User clicks بازگردانی → onUndo API → success toast → dismiss
  ├─ Timeout → dismiss
  └─ New action → replace previous undo

User presses ? → shortcuts modal
User presses / → focus search (list pages)
```

---

## Policy Alignment

- [ ] Financial undo — server-side only (DEVELOPMENT_RULES)
- [ ] Audit on undo
- [ ] Idempotency for financial reverse (documented in UNDO-PATTERN.md)
- [ ] ADR-004 — undo may require same permission as action

---

## مراجع

- `IFP-TASK-031-realtime-notifications-shell.md`
- `IFP-TASK-020-multi-select-bulk-action-bar.md`
- `docs/01-product/installment-module-features.md` — Undo، میانبرها
- `docs/03-modules/installments/state-machines.md` — reversible transitions

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | |
| Policy | /25 | 25 | Financial undo rules |
| Executability | /25 | 24 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 ✅ |
