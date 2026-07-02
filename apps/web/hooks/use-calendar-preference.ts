'use client';

import {
  CALENDAR_STORAGE_KEY,
  defaultCalendarForLocale,
  resolveCalendarPreference,
  type CalendarSystem,
} from '@hivork/i18n';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

export type CalendarPreference = CalendarSystem;

export function useCalendarPreference() {
  const locale = useLocale() as 'fa' | 'en';
  const [calendar, setCalendarState] = useState<CalendarPreference>(() =>
    defaultCalendarForLocale(locale),
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CALENDAR_STORAGE_KEY);
      setCalendarState(resolveCalendarPreference(locale, stored));
    } catch {
      setCalendarState(defaultCalendarForLocale(locale));
    }
  }, [locale]);

  const setCalendar = useCallback((next: CalendarPreference) => {
    setCalendarState(next);
    try {
      window.localStorage.setItem(CALENDAR_STORAGE_KEY, next);
    } catch {
      // private mode
    }
  }, []);

  const toggleCalendar = useCallback(() => {
    setCalendar(calendar === 'jalali' ? 'gregorian' : 'jalali');
  }, [calendar, setCalendar]);

  return { calendar, setCalendar, toggleCalendar, locale };
}
