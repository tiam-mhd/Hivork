const IRAN_MOBILE_PATTERN = /^09\d{9}$/;

/** Mask phone for display: 0912***4567 */
export function maskPhone(phone: string): string {
  if (!IRAN_MOBILE_PATTERN.test(phone)) {
    return phone;
  }
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

/** Format phone for LTR display field */
export function formatPhoneDisplay(phone: string): string {
  if (!IRAN_MOBILE_PATTERN.test(phone)) {
    return phone;
  }
  return phone;
}
