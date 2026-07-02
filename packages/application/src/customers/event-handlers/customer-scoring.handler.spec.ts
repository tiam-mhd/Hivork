import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CustomerScoringHandler } from './customer-scoring.handler.js';

describe('CustomerScoringHandler', () => {
  const tenantCustomers = {
    findFullDetailById: vi.fn(),
    updateLink: vi.fn(),
  };
  const settings = {
    findByModule: vi.fn(),
  };
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };

  const handler = new CustomerScoringHandler(
    tenantCustomers as never,
    settings as never,
    unitOfWork as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    settings.findByModule.mockResolvedValue({
      customer_scoring_payment_confirmed_delta: 5,
      customer_scoring_installment_overdue_delta: -10,
      customer_auto_blacklist_score_threshold: null,
    });
  });

  it('applies payment confirmed score delta once per outbox event id', async () => {
    tenantCustomers.findFullDetailById
      .mockResolvedValueOnce({
        id: 'customer-1',
        tenantId: 'tenant-1',
        version: 1,
        creditScore: 100,
        overdueCount: 1,
        isBlacklisted: false,
        metadata: null,
      })
      .mockResolvedValueOnce({
        id: 'customer-1',
        tenantId: 'tenant-1',
        version: 2,
        creditScore: 105,
        overdueCount: 0,
        isBlacklisted: false,
        metadata: { scoringProcessedEventIds: ['outbox-1'] },
      });
    tenantCustomers.updateLink.mockResolvedValue({});

    const event = {
      id: 'outbox-1',
      tenantId: 'tenant-1',
      eventType: 'payment.confirmed',
      aggregateId: 'payment-1',
      aggregateType: 'payment_attempt',
      payload: {
        tenantId: 'tenant-1',
        tenantCustomerId: 'customer-1',
        wasOverdueInstallment: true,
      },
    };

    await handler.handle(event);
    await handler.handle(event);

    expect(tenantCustomers.updateLink).toHaveBeenCalledOnce();
    expect(tenantCustomers.updateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        creditScore: 105,
        overdueCount: 0,
      }),
      expect.anything(),
    );
  });

  it('auto-blacklists when score drops below tenant threshold', async () => {
    settings.findByModule.mockResolvedValue({
      customer_scoring_payment_confirmed_delta: 5,
      customer_scoring_installment_overdue_delta: -10,
      customer_auto_blacklist_score_threshold: 50,
    });

    tenantCustomers.findFullDetailById.mockResolvedValue({
      id: 'customer-1',
      tenantId: 'tenant-1',
      version: 2,
      creditScore: 55,
      overdueCount: 0,
      isBlacklisted: false,
      metadata: null,
    });

    await handler.handle({
      id: 'outbox-2',
      tenantId: 'tenant-1',
      eventType: 'installment.overdue',
      aggregateId: 'installment-1',
      aggregateType: 'installment',
      payload: {
        tenantId: 'tenant-1',
        tenantCustomerId: 'customer-1',
      },
    });

    expect(tenantCustomers.updateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        creditScore: 45,
        overdueCount: 1,
        isBlacklisted: true,
        blacklistReason: expect.stringContaining('Auto-blacklisted'),
      }),
      expect.anything(),
    );
  });
});
