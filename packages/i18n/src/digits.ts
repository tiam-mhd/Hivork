/** Converts Western digits in a string to Persian (fa-IR) numerals. */
export function toPersianDigits(value: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
  return value.replace(/\d/g, (digit) => persianDigits[Number(digit)]!);
}

/** Converts Persian/Arabic digits to Western numerals. */
export function toWesternDigits(value: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persianIndex = persian.indexOf(char);
    if (persianIndex >= 0) {
      return String(persianIndex);
    }
    const arabicIndex = arabic.indexOf(char);
    if (arabicIndex >= 0) {
      return String(arabicIndex);
    }
    return char;
  });
}

export function formatPersianDigits(value: string | number): string {
  return toPersianDigits(String(value));
}
