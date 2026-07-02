import { describe, expect, it } from 'vitest';

import { MAX_CONTRACT_COLLATERALS_PER_SALE } from './contract-collateral.constants.js';

describe('ContractCollateral constants (IFP-066)', () => {
  it('defines max collaterals per sale', () => {
    expect(MAX_CONTRACT_COLLATERALS_PER_SALE).toBe(20);
  });
});
