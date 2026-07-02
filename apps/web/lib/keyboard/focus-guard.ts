export function isInputFocused(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const active = document.activeElement;
  if (!active) {
    return false;
  }

  const tag = active.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }

  if (active instanceof HTMLElement && active.isContentEditable) {
    return true;
  }

  return false;
}
