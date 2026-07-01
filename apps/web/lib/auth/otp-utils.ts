export const OTP_LENGTH = 5;
export const TOTP_LENGTH = 6;

export function splitCodeDigits(code: string, length: number): string[] {
  const digits = code.replace(/\D/g, '').slice(0, length).split('');
  while (digits.length < length) {
    digits.push('');
  }
  return digits;
}

export function joinCodeDigits(digits: string[], length: number): string {
  return digits.join('').replace(/\D/g, '').slice(0, length);
}

export function nextCodeFocusIndex(
  currentIndex: number,
  digit: string,
  length: number,
): number | null {
  if (digit.length === 1 && currentIndex < length - 1) {
    return currentIndex + 1;
  }
  return null;
}

export function splitOtpDigits(code: string): string[] {
  return splitCodeDigits(code, OTP_LENGTH);
}

export function joinOtpDigits(digits: string[]): string {
  return joinCodeDigits(digits, OTP_LENGTH);
}

/** Returns the index of the next OTP cell to focus after input, or null if unchanged. */
export function nextOtpFocusIndex(currentIndex: number, digit: string): number | null {
  return nextCodeFocusIndex(currentIndex, digit, OTP_LENGTH);
}
