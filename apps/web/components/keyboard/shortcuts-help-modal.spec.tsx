import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShortcutsHelpModal } from './shortcuts-help-modal';

import { registerShortcut } from '@/lib/keyboard/shortcuts-registry';

describe('ShortcutsHelpModal', () => {
  it('lists registered shortcuts', () => {
    const unregister = registerShortcut({
      id: 'test:search',
      keys: '/',
      description: 'فوکوس جستجو',
      scope: 'list',
      handler: vi.fn(),
    });

    render(<ShortcutsHelpModal open onClose={vi.fn()} scope="all" />);

    expect(screen.getByText('فوکوس جستجو')).toBeTruthy();
    expect(screen.getByText('/')).toBeTruthy();

    unregister();
  });
});
