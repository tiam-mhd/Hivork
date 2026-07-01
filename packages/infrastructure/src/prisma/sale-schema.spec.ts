import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

describe('Sale Prisma schema (TASK-061)', () => {
  it('maps totalAmountRial and downPaymentRial as BigInt fields', () => {
    const totalField = Prisma.dmmf.datamodel.models
      .find((model) => model.name === 'Sale')
      ?.fields.find((field) => field.name === 'totalAmountRial');

    const downPaymentField = Prisma.dmmf.datamodel.models
      .find((model) => model.name === 'Sale')
      ?.fields.find((field) => field.name === 'downPaymentRial');

    expect(totalField?.type).toBe('BigInt');
    expect(downPaymentField?.type).toBe('BigInt');
  });

  it('requires branchId and tenantId on Sale', () => {
    const saleModel = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Sale');
    const branchId = saleModel?.fields.find((field) => field.name === 'branchId');
    const tenantId = saleModel?.fields.find((field) => field.name === 'tenantId');

    expect(branchId?.isRequired).toBe(true);
    expect(tenantId?.isRequired).toBe(true);
  });

  it('defines SaleStatus enum with ACTIVE, COMPLETED, CANCELLED', () => {
    const saleStatus = Prisma.dmmf.datamodel.enums.find((enumDef) => enumDef.name === 'SaleStatus');

    expect(saleStatus?.values.map((value) => value.name)).toEqual([
      'ACTIVE',
      'COMPLETED',
      'CANCELLED',
    ]);
  });
});
