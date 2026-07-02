import { getGregorianPartsFromIso, getJalaliPartsFromIso, toGregorianIsoDate } from '@hivork/i18n';

import type { ContractNumberingSettingsDto } from '@hivork/contracts';

export function resolveContractNumberYear(
  calendarDisplayMode: ContractNumberingSettingsDto['calendar_display_mode'],
  referenceDateIso: string,
): number {
  if (calendarDisplayMode === 'gregorian') {
    const parts = getGregorianPartsFromIso(referenceDateIso);
    return parts?.year ?? new Date().getFullYear();
  }

  const jalaliParts = getJalaliPartsFromIso(referenceDateIso);
  if (jalaliParts) {
    return jalaliParts.year;
  }

  const gregorianParts = getGregorianPartsFromIso(referenceDateIso);
  return gregorianParts?.year ?? new Date().getFullYear();
}

export function formatContractNumber(
  settings: ContractNumberingSettingsDto,
  sequence: number,
  referenceDateIso: string = toGregorianIsoDate(new Date()),
): string {
  const segments: string[] = [settings.contract_number_prefix.trim()];

  if (settings.contract_number_include_year) {
    segments.push(String(resolveContractNumberYear(settings.calendar_display_mode, referenceDateIso)));
  }

  segments.push(String(sequence).padStart(settings.contract_number_pad_length, '0'));

  let formatted = segments.join('-');

  if (settings.contract_number_suffix && settings.contract_number_suffix.trim().length > 0) {
    formatted = `${formatted}-${settings.contract_number_suffix.trim()}`;
  }

  return formatted;
}
