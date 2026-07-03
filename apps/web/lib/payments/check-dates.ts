import { getJalaliPartsFromIso } from '@hivork/i18n';

/** API expects `1405-12-01` Jalali due date for check endpoints. */
export function isoDateToCheckDueDateInput(isoDate: string): string {
  const parts = getJalaliPartsFromIso(isoDate);
  if (!parts) {
    return '';
  }
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}
