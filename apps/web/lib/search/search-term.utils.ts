/** True when search should fire immediately (phone/numeric) without min-length gate. */
export function isImmediateSearchTerm(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4;
}

/** Whether a draft search term should trigger a list query after debounce. */
export function shouldCommitSearchTerm(value: string, minLength = 2): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (isImmediateSearchTerm(trimmed)) {
    return true;
  }
  return trimmed.length >= minLength;
}
