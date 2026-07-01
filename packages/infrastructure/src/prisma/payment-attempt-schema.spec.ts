import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

describe('PaymentAttempt Prisma schema (TASK-063)', () => {
  it('maps amountRial as BigInt', () => {
    const amountField = Prisma.dmmf.datamodel.models
      .find((model) => model.name === 'PaymentAttempt')
      ?.fields.find((field) => field.name === 'amountRial');

    expect(amountField?.type).toBe('BigInt');
  });

  it('defines ReportedByType enum', () => {
    const reportedByType = Prisma.dmmf.datamodel.enums.find(
      (enumDef) => enumDef.name === 'ReportedByType',
    );

    expect(reportedByType?.values.map((value) => value.name)).toEqual(['CUSTOMER', 'STAFF']);
  });

  it('defines PaymentAttemptStatus enum for state machine', () => {
    const paymentStatus = Prisma.dmmf.datamodel.enums.find(
      (enumDef) => enumDef.name === 'PaymentAttemptStatus',
    );

    expect(paymentStatus?.values.map((value) => value.name)).toEqual([
      'PENDING',
      'CONFIRMED',
      'REJECTED',
    ]);
  });

  it('has unique constraint on tenantId + idempotencyKey', () => {
    const paymentModel = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'PaymentAttempt',
    );

    const unique = paymentModel?.uniqueFields.find(
      (fields) =>
        fields.length === 2 && fields.includes('tenantId') && fields.includes('idempotencyKey'),
    );

    expect(unique).toBeDefined();
  });

  it('includes pending lookup fields tenantId, installmentId, status', () => {
    const paymentModel = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'PaymentAttempt',
    );
    const fieldNames = paymentModel?.fields.map((field) => field.name) ?? [];

    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'tenantId',
        'installmentId',
        'status',
        'idempotencyKey',
        'reportedByType',
        'reportedById',
      ]),
    );
  });
});
