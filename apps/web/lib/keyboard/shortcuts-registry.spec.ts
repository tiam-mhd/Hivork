import { describe, expect, it, vi } from 'vitest';

import { handleShortcutKeydown, registerShortcut } from './shortcuts-registry';

describe('handleShortcutKeydown', () => {
  it('ignores shortcuts when input is focused', () => {
    const handler = vi.fn();
    const unregister = registerShortcut({
      id: 'test:slash',
      keys: '/',
      description: 'search',
      scope: 'list',
      handler,
    });

    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true });
    const handled = handleShortcutKeydown(event, true);

    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    unregister();
  });
});
