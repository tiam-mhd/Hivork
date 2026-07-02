import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './theme-toggle';

const setThemeMode = vi.fn();

vi.mock('@hivork/theme/react', () => ({
  useThemeOptional: () => ({
    themeMode: 'light',
    setThemeMode,
  }),
}));

describe('ThemeToggle', () => {
  it('switches theme mode from the menu', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'تغییر تم' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /تاریک/ }));

    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });
});
