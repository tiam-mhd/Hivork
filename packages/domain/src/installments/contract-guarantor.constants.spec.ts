import { describe, expect, it } from 'vitest';

import { MAX_CONTRACT_GUARANTORS_PER_SALE } from './contract-guarantor.constants.js';

describe('ContractGuarantor constants (IFP-065)', () => {
  it('defines max guarantors per sale', () => {
    expect(MAX_CONTRACT_GUARANTORS_PER_SALE).toBe(10);
  });
});
