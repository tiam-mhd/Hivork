import { describe, expect, it } from 'vitest';

import { isInputFocused } from './focus-guard';

describe('isInputFocused', () => {
  it('returns true when an input is active', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    expect(isInputFocused()).toBe(true);

    document.body.removeChild(input);
  });

  it('returns false when focus is on body', () => {
    document.body.focus();
    expect(isInputFocused()).toBe(false);
  });
});
