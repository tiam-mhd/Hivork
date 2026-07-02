import { describe, expect, it } from 'vitest';

import { MAX_CONTRACT_ATTACHMENTS_PER_SALE } from './contract-attachment.constants.js';

describe('ContractAttachment constants (IFP-057)', () => {
  it('defines max attachments per sale', () => {
    expect(MAX_CONTRACT_ATTACHMENTS_PER_SALE).toBe(50);
  });
});
