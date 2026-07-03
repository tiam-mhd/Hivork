import { getJalaliPartsFromIso } from '@hivork/i18n';

export function formatSettlementBatchNumber(
  sequence: number,
  referenceDate: Date = new Date(),
): string {
  const jalali = getJalaliPartsFromIso(referenceDate.toISOString());
  const yearMonth = jalali
    ? `${jalali.year}${String(jalali.month).padStart(2, '0')}`
    : referenceDate.toISOString().slice(0, 7).replace('-', '');

  return `STL-${yearMonth}-${String(sequence).padStart(3, '0')}`;
}
