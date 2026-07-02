import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from './date-picker';

vi.mock('next-intl', () => ({
  useLocale: () => 'fa',
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('@/hooks/use-calendar-preference', () => ({
  useCalendarPreference: () => ({
    calendar: 'jalali',
    setCalendar: vi.fn(),
    toggleCalendar: vi.fn(),
    locale: 'fa',
  }),
}));

describe('DatePicker', () => {
  it('renders jalali display for iso value', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2024-03-20" onChange={onChange} />);
    expect(screen.getByDisplayValue('۱۴۰۳/۰۱/۰۱')).toBeTruthy();
  });
});
