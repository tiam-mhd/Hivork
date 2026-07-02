'use client';

import { useEffect, useId, useRef } from 'react';

import { isInputFocused } from '@/lib/keyboard/focus-guard';
import {
  registerShortcut,
  type ShortcutDefinition,
  type ShortcutScope,
} from '@/lib/keyboard/shortcuts-registry';

type UseKeyboardShortcutOptions = {
  scope: ShortcutScope;
  when?: () => boolean;
  sequence?: string[];
  description?: string;
  descriptionEn?: string;
  enabled?: boolean;
};

export function useKeyboardShortcut(
  keys: string,
  handler: () => void,
  options: UseKeyboardShortcutOptions,
): void {
  const {
    scope,
    when,
    sequence,
    description = keys,
    descriptionEn,
    enabled = true,
  } = options;
  const shortcutId = useId();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const definition: ShortcutDefinition = {
      id: `${scope}:${shortcutId}`,
      keys,
      description,
      descriptionEn,
      scope,
      handler: () => handlerRef.current(),
      when: () => {
        if (when && !when()) {
          return false;
        }
        if (keys.toLowerCase() !== 'escape' && isInputFocused()) {
          return false;
        }
        return true;
      },
      sequence,
    };

    return registerShortcut(definition);
  }, [description, descriptionEn, enabled, keys, scope, sequence, shortcutId, when]);
}
