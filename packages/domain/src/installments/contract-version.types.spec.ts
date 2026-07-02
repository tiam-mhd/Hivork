import { describe, expect, it } from 'vitest';

import {
  CONTRACT_VERSION_MIN_CHANGE_REASON_LENGTH,
  assertValidChangeReason,
  isContractVersionSnapshot,
  type ContractVersionSnapshot,
} from './contract-version.types.js';

describe('ContractVersionSnapshot (IFP-056)', () => {
  it('documents required sale key in snapshot shape', () => {
    const snapshot: ContractVersionSnapshot = {
      sale: { id: 'sale-1', status: 'ACTIVE', totalAmountRial: '1000000' },
      installmentSchedule: [{ sequenceNumber: 1, amountRial: '500000' }],
      settingsHash: 'abc123',
    };

    expect(isContractVersionSnapshot(snapshot)).toBe(true);
  });

  it('rejects snapshot without sale object', () => {
    expect(isContractVersionSnapshot({ lineItems: [] })).toBe(false);
    expect(isContractVersionSnapshot(null)).toBe(false);
  });

  it('enforces minimum changeReason length', () => {
    expect(() => assertValidChangeReason('ab')).toThrow(
      `changeReason must be at least ${CONTRACT_VERSION_MIN_CHANGE_REASON_LENGTH} characters`,
    );
    expect(() => assertValidChangeReason('valid reason')).not.toThrow();
  });
});
