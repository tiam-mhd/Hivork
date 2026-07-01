import { describe, expect, it } from 'vitest';

import { isPhoneReadOnly } from '@/lib/schemas/customer-form.schema';

import { shouldConfirmLeave, UNSAVED_LEAVE_MESSAGE } from './use-unsaved-warning';

describe('isPhoneReadOnly', () => {
  it('is readonly in edit mode', () => {
    expect(isPhoneReadOnly('edit')).toBe(true);
    expect(isPhoneReadOnly('create')).toBe(false);
  });
});

describe('useUnsavedWarning helpers', () => {
  it('requires confirmation when dirty', () => {
    expect(shouldConfirmLeave(true)).toBe(true);
    expect(shouldConfirmLeave(false)).toBe(false);
  });

  it('has Persian leave message', () => {
    expect(UNSAVED_LEAVE_MESSAGE).toContain('ذخیره نشده');
  });
});
