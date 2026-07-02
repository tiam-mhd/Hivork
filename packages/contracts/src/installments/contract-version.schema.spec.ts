import { describe, expect, it } from 'vitest';

import {
  ContractVersionChangeTypeSchema,
  ContractVersionSchema,
  ContractVersionSummarySchema,
  ListContractVersionsQuerySchema,
} from './contract-version.schema.js';

const VERSION_ID = '00000000-0000-0000-0000-000000000030';
const SALE_ID = '00000000-0000-0000-0000-000000000010';
const STAFF_ID = '00000000-0000-0000-0000-000000000099';

const VALID_VERSION = {
  id: VERSION_ID,
  saleId: SALE_ID,
  versionNumber: 1,
  changeType: 'create' as const,
  changeReason: 'initial contract creation',
  createdAt: '2026-07-01T10:00:00.000Z',
  createdById: STAFF_ID,
};

describe('ContractVersionSchema (IFP-058)', () => {
  it('parses valid version payload', () => {
    const parsed = ContractVersionSchema.parse(VALID_VERSION);
    expect(parsed.changeType).toBe('create');
    expect(parsed.versionNumber).toBe(1);
  });

  it('accepts all change types', () => {
    for (const changeType of ContractVersionChangeTypeSchema.options) {
      expect(
        ContractVersionSchema.parse({ ...VALID_VERSION, changeType }).changeType,
      ).toBe(changeType);
    }
  });

  it('rejects non-positive versionNumber', () => {
    expect(() => ContractVersionSchema.parse({ ...VALID_VERSION, versionNumber: 0 })).toThrow();
  });
});

describe('ContractVersionSummarySchema', () => {
  it('omits saleId for embedded sale detail', () => {
    const parsed = ContractVersionSummarySchema.parse({
      id: VERSION_ID,
      versionNumber: 2,
      changeType: 'financial_recalc',
      changeReason: 'schedule recalculated',
      createdAt: '2026-07-02T10:00:00.000Z',
      createdById: STAFF_ID,
    });

    expect(parsed).not.toHaveProperty('saleId');
  });
});

describe('ListContractVersionsQuerySchema', () => {
  it('defaults limit to 50', () => {
    expect(ListContractVersionsQuerySchema.parse({}).limit).toBe(50);
  });

  it('rejects limit above 100', () => {
    expect(() => ListContractVersionsQuerySchema.parse({ limit: 101 })).toThrow();
  });
});
