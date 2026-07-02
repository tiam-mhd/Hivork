import { describe, expect, it } from 'vitest';

import { CreateCollateralSchema } from './collateral.schema.js';
import { CreateGuarantorSchema } from './guarantor.schema.js';

describe('Guarantor schemas (IFP-067)', () => {
  it('requires tenant customer or external identity', () => {
    const result = CreateGuarantorSchema.safeParse({
      relationship: 'parent',
    });

    expect(result.success).toBe(false);
  });

  it('accepts linked tenant customer', () => {
    const result = CreateGuarantorSchema.safeParse({
      tenantCustomerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      relationship: 'spouse',
    });

    expect(result.success).toBe(true);
  });

  it('accepts external guarantor with phone', () => {
    const result = CreateGuarantorSchema.safeParse({
      fullName: 'علی رضایی',
      phone: '09123456789',
      relationship: 'other',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('09123456789');
    }
  });
});

describe('Collateral schemas (IFP-067)', () => {
  it('rejects zero estimated value', () => {
    const result = CreateCollateralSchema.safeParse({
      collateralType: 'gold',
      title: 'طلای وثیقه',
      estimatedValueRial: '0',
    });

    expect(result.success).toBe(false);
  });

  it('parses positive estimated value as bigint', () => {
    const result = CreateCollateralSchema.safeParse({
      collateralType: 'cheque',
      title: 'چک',
      estimatedValueRial: '5000000',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedValueRial).toBe(5_000_000n);
    }
  });
});
