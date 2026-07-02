export type ShortcutScope = 'global' | 'list' | 'detail' | 'modal';

export type ShortcutDefinition = {
  id: string;
  keys: string;
  description: string;
  descriptionEn?: string;
  scope: ShortcutScope;
  handler: () => void;
  when?: () => boolean;
  /** Vim-style sequence e.g. ['g', 'c'] */
  sequence?: string[];
};

const shortcuts = new Map<string, ShortcutDefinition>();
const registrationOrder: string[] = [];

let sequenceBuffer: string[] = [];
let sequenceTimer: ReturnType<typeof setTimeout> | null = null;

export function registerShortcut(definition: ShortcutDefinition): () => void {
  shortcuts.set(definition.id, definition);
  registrationOrder.push(definition.id);

  return () => {
    shortcuts.delete(definition.id);
    const index = registrationOrder.indexOf(definition.id);
    if (index >= 0) {
      registrationOrder.splice(index, 1);
    }
  };
}

export function getShortcutsForScope(scope: ShortcutScope | 'all'): ShortcutDefinition[] {
  const items = registrationOrder
    .map((id) => shortcuts.get(id))
    .filter((item): item is ShortcutDefinition => Boolean(item));

  if (scope === 'all') {
    return items;
  }

  return items.filter((item) => item.scope === scope || item.scope === 'global');
}

export function clearShortcutSequenceBuffer(): void {
  sequenceBuffer = [];
  if (sequenceTimer) {
    clearTimeout(sequenceTimer);
    sequenceTimer = null;
  }
}

function pushSequenceKey(key: string): void {
  sequenceBuffer.push(key);
  if (sequenceTimer) {
    clearTimeout(sequenceTimer);
  }
  sequenceTimer = setTimeout(() => {
    clearShortcutSequenceBuffer();
  }, 1000);
}

function matchesKeyboardEvent(definition: ShortcutDefinition, event: KeyboardEvent): boolean {
  if (definition.when && !definition.when()) {
    return false;
  }

  if (definition.sequence && definition.sequence.length > 0) {
    return false;
  }

  const keys = definition.keys.toLowerCase();

  if (keys === '?') {
    return event.key === '?' || (event.key === '/' && event.shiftKey);
  }

  if (keys === '/') {
    return event.key === '/' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  if (keys === 'escape') {
    return event.key === 'Escape';
  }

  const parts = keys.split('+').map((part) => part.trim().toLowerCase());
  const needsCtrl = parts.includes('ctrl');
  const needsMeta = parts.includes('meta') || parts.includes('cmd') || parts.includes('⌘');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');
  const mainKey = parts.find(
    (part) => !['ctrl', 'meta', 'cmd', '⌘', 'shift', 'alt'].includes(part),
  );

  if (!mainKey) {
    return false;
  }

  const ctrlOrMeta = event.ctrlKey || event.metaKey;
  if (needsCtrl && !ctrlOrMeta) return false;
  if (needsMeta && !event.metaKey && !event.ctrlKey) return false;
  if (!needsCtrl && !needsMeta && ctrlOrMeta && mainKey.length === 1) return false;
  if (needsShift !== event.shiftKey) return false;
  if (needsAlt !== event.altKey) return false;

  return event.key.toLowerCase() === mainKey.toLowerCase();
}

function matchesSequence(definition: ShortcutDefinition): boolean {
  if (!definition.sequence || definition.sequence.length === 0) {
    return false;
  }
  if (definition.when && !definition.when()) {
    return false;
  }
  if (sequenceBuffer.length !== definition.sequence.length) {
    return false;
  }
  return definition.sequence.every((key, index) => key.toLowerCase() === sequenceBuffer[index]?.toLowerCase());
}

export function handleShortcutKeydown(event: KeyboardEvent, isInputFocused: boolean): boolean {
  if (isInputFocused && event.key !== 'Escape') {
    return false;
  }

  const lowered = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  for (let index = registrationOrder.length - 1; index >= 0; index -= 1) {
    const definition = shortcuts.get(registrationOrder[index]!);
    if (!definition) {
      continue;
    }
    if (matchesKeyboardEvent(definition, event)) {
      event.preventDefault();
      definition.handler();
      return true;
    }
  }

  if (lowered.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    pushSequenceKey(lowered);
    for (let index = registrationOrder.length - 1; index >= 0; index -= 1) {
      const definition = shortcuts.get(registrationOrder[index]!);
      if (!definition?.sequence?.length) {
        continue;
      }
      if (matchesSequence(definition)) {
        event.preventDefault();
        clearShortcutSequenceBuffer();
        definition.handler();
        return true;
      }
    }
  }

  return false;
}

export function formatShortcutKeys(keys: string): string {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return keys
    .replace(/Meta|Cmd|⌘/gi, isMac ? '⌘' : 'Ctrl')
    .replace(/Ctrl/gi, isMac ? '⌃' : 'Ctrl')
    .replace(/Shift/gi, '⇧')
    .replace(/Alt/gi, isMac ? '⌥' : 'Alt');
}
