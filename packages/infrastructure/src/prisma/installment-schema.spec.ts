import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

describe('Installment Prisma schema (TASK-062)', () => {
  it('maps amountRial as BigInt', () => {
    const amountField = Prisma.dmmf.datamodel.models
      .find((model) => model.name === 'Installment')
      ?.fields.find((field) => field.name === 'amountRial');

    expect(amountField?.type).toBe('BigInt');
  });

  it('defines unique constraint on saleId + sequenceNumber', () => {
    const installmentModel = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'Installment',
    );

    const unique = installmentModel?.uniqueFields.find(
      (fields) => fields.length === 2 && fields.includes('saleId') && fields.includes('sequenceNumber'),
    );

    expect(unique).toBeDefined();
  });

  it('defines InstallmentStatus enum with all state-machine states', () => {
    const installmentStatus = Prisma.dmmf.datamodel.enums.find(
      (enumDef) => enumDef.name === 'InstallmentStatus',
    );

    expect(installmentStatus?.values.map((value) => value.name)).toEqual([
      'PENDING',
      'PAID',
      'OVERDUE',
      'WAIVED',
    ]);
  });

  it('includes report query fields tenantId, status, dueDate', () => {
    const installmentModel = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'Installment',
    );
    const fieldNames = installmentModel?.fields.map((field) => field.name) ?? [];

    expect(fieldNames).toEqual(
      expect.arrayContaining(['tenantId', 'status', 'dueDate', 'saleId', 'sequenceNumber']),
    );
  });
});
