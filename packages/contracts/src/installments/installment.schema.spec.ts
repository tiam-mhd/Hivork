import { describe, expect, it } from 'vitest';

import {
  InstallmentDetailSchema,
  InstallmentStatusSchema,
  InstallmentSummarySchema,
  ListInstallmentsQuerySchema,
  OverdueInstallmentsQuerySchema,
  TodayInstallmentsQuerySchema,
} from './installment.schema.js';

describe('InstallmentStatusSchema', () => {
  it('accepts state-machine values', () => {
    expect(InstallmentStatusSchema.parse('pending')).toBe('pending');
    expect(InstallmentStatusSchema.parse('overdue')).toBe('overdue');
    expect(InstallmentStatusSchema.parse('paid')).toBe('paid');
    expect(InstallmentStatusSchema.parse('waived')).toBe('waived');
  });

  it('rejects invalid status', () => {
    expect(() => InstallmentStatusSchema.parse('active')).toThrow();
  });
});

describe('ListInstallmentsQuerySchema', () => {
  it('defaults limit=20 and sort=dueDate:asc', () => {
    const query = ListInstallmentsQuerySchema.parse({});
    expect(query.limit).toBe(20);
    expect(query.sort).toBe('dueDate:asc');
  });

  it('rejects limit above 100', () => {
    expect(() => ListInstallmentsQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it('parses comma-separated status filter', () => {
    const query = ListInstallmentsQuerySchema.parse({ status: 'pending,overdue' });
    expect(query.status).toEqual(['pending', 'overdue']);
  });

  it('rejects from after to', () => {
    const result = ListInstallmentsQuerySchema.safeParse({
      from: '2026-08-01',
      to: '2026-07-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('InstallmentSummarySchema', () => {
  it('parses overdue list item', () => {
    const item = InstallmentSummarySchema.parse({
      id: '00000000-0000-0000-0000-000000000010',
      saleId: '00000000-0000-0000-0000-000000000020',
      customer: {
        id: '00000000-0000-0000-0000-000000000001',
        phone: '09121234567',
        name: 'حسین احمدی',
      },
      branchId: '00000000-0000-0000-0000-000000000002',
      sequenceNumber: 3,
      dueDate: '2025-03-01T00:00:00.000Z',
      amountRial: '2000000',
      status: 'overdue',
      daysOverdue: 5,
    });

    expect(item.status).toBe('overdue');
    expect(item.daysOverdue).toBe(5);
  });
});

describe('InstallmentDetailSchema', () => {
  it('parses detail with sale reference', () => {
    const detail = InstallmentDetailSchema.parse({
      id: '00000000-0000-0000-0000-000000000010',
      saleId: '00000000-0000-0000-0000-000000000020',
      customer: {
        id: '00000000-0000-0000-0000-000000000001',
        phone: '09121234567',
        name: 'حسین احمدی',
      },
      branchId: '00000000-0000-0000-0000-000000000002',
      sequenceNumber: 1,
      dueDate: '2025-03-01T00:00:00.000Z',
      amountRial: '2000000',
      status: 'pending',
      sale: {
        id: '00000000-0000-0000-0000-000000000020',
        title: 'موبایل سامسونگ S23',
        status: 'active',
        branchId: '00000000-0000-0000-0000-000000000002',
      },
    });

    expect(detail.sale.title).toBe('موبایل سامسونگ S23');
  });
});

describe('TodayInstallmentsQuerySchema', () => {
  it('branchId is optional', () => {
    expect(TodayInstallmentsQuerySchema.parse({}).branchId).toBeUndefined();
    expect(
      TodayInstallmentsQuerySchema.parse({
        branchId: '00000000-0000-0000-0000-000000000002',
      }).branchId,
    ).toBe('00000000-0000-0000-0000-000000000002');
  });
});

describe('OverdueInstallmentsQuerySchema', () => {
  it('coerces minDaysOverdue', () => {
    const query = OverdueInstallmentsQuerySchema.parse({ minDaysOverdue: '3' });
    expect(query.minDaysOverdue).toBe(3);
    expect(query.sort).toBe('daysOverdue:desc');
  });
});
