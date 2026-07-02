'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { ShortcutsHelpModal } from '@/components/keyboard/shortcuts-help-modal';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { isInputFocused } from '@/lib/keyboard/focus-guard';
import {
  handleShortcutKeydown,
  registerShortcut,
} from '@/lib/keyboard/shortcuts-registry';

export const HIVORK_ESCAPE_EVENT = 'hivork:escape';

type KeyboardShortcutsProviderProps = {
  children: ReactNode;
};

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);

  useKeyboardShortcut('?', openHelp, {
    scope: 'global',
    description: 'نمایش راهنمای میانبرها',
    descriptionEn: 'Open shortcuts help',
    when: () => !helpOpen,
  });

  useKeyboardShortcut(
    'Escape',
    () => {
      if (helpOpen) {
        closeHelp();
        return;
      }
      document.dispatchEvent(new CustomEvent(HIVORK_ESCAPE_EVENT));
    },
    {
      scope: 'global',
      description: 'بستن پنجره یا منو',
      descriptionEn: 'Close modal or drawer',
    },
  );

  useEffect(() => {
    return registerShortcut({
      id: 'global:nav:customers',
      keys: 'g c',
      sequence: ['g', 'c'],
      description: 'رفتن به مشتریان',
      descriptionEn: 'Go to customers',
      scope: 'global',
      when: () => !isInputFocused(),
      handler: () => router.push('/admin/customers'),
    });
  }, [router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      handleShortcutKeydown(event, isInputFocused());
    }

    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, []);

  return (
    <>
      {children}
      <ShortcutsHelpModal open={helpOpen} onClose={closeHelp} scope="all" />
    </>
  );
}
