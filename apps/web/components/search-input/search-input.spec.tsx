import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchInput } from './search-input';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('debounces onChange once after 300ms', () => {
    const onChange = vi.fn();

    render(<SearchInput value="" onChange={onChange} debounceMs={300} minLength={2} />);

    const input = screen.getByLabelText('جستجو');
    fireEvent.change(input, { target: { value: 'ab' } });

    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('ab');
  });

  it('does not search for single character unless numeric', () => {
    const onChange = vi.fn();

    render(<SearchInput value="" onChange={onChange} debounceMs={300} minLength={2} />);

    const input = screen.getByLabelText('جستجو');
    fireEvent.change(input, { target: { value: 'a' } });
    vi.advanceTimersByTime(300);

    expect(onChange).not.toHaveBeenCalled();
  });
});
