import { describe, expect, it } from 'vitest';

import { ContractCollateral } from './contract-collateral.entity.js';
import { MAX_CONTRACT_COLLATERALS_PER_SALE } from './contract-collateral.constants.js';
import { DomainError } from '../errors/domain.error.js';

describe('ContractCollateral (IFP-066)', () => {
  const baseInput = {
    tenantId: 'tenant-1',
    saleId: 'sale-1',
    collateralType: 'CHEQUE' as const,
    title: '  چک ضمانت  ',
    estimatedValueRial: 50_000_000n,
    createdById: 'staff-1',
  };

  it('creates pledged collateral with bigint value', () => {
    const collateral = ContractCollateral.create(baseInput);

    expect(collateral.status).toBe('PLEDGED');
    expect(collateral.title).toBe('چک ضمانت');
    expect(collateral.estimatedValueRial).toBe(50_000_000n);
  });

  it('rejects zero estimated value', () => {
    expect(() =>
      ContractCollateral.create({
        ...baseInput,
        estimatedValueRial: 0n,
      }),
    ).toThrow(/AMOUNT_INVALID/);
  });

  it('releases pledged collateral', () => {
    const collateral = ContractCollateral.create(baseInput);

    collateral.release('staff-2');

    expect(collateral.status).toBe('RELEASED');
  });

  it('forfeits pledged collateral', () => {
    const collateral = ContractCollateral.create(baseInput);

    collateral.forfeit('staff-2');

    expect(collateral.status).toBe('FORFEITED');
  });

  it('rejects forfeit from released status', () => {
    const collateral = ContractCollateral.create(baseInput);
    collateral.release('staff-2');

    expect(() => collateral.forfeit('staff-3')).toThrow(DomainError);
    expect(() => collateral.forfeit('staff-3')).toThrow(/INVALID_COLLATERAL_STATUS/);
  });

  it('enforces max collaterals per sale', () => {
    expect(() => ContractCollateral.assertLimit(MAX_CONTRACT_COLLATERALS_PER_SALE)).toThrow(
      /COLLATERAL_LIMIT_EXCEEDED/,
    );
  });
});
