import { describe, expect, it } from 'vitest';

import {
  MockPaymentGateway,
  signMockPaymentGatewayPayload,
  verifyMockPaymentGatewaySignature,
} from './mock-payment.gateway.js';

describe('MockPaymentGateway (IFP-089)', () => {
  const gateway = new MockPaymentGateway({
    webhookSecret: 'test-secret',
    publicApiBaseUrl: 'http://localhost:4000',
    nodeEnv: 'test',
  });

  it('creates redirect URL for payment init', async () => {
    const result = await gateway.createPayment({
      tenantId: 'tenant-1',
      paymentAttemptId: '00000000-0000-0000-0000-000000000010',
      installmentId: '00000000-0000-0000-0000-000000000020',
      amountRial: 5_000_000n,
      returnUrl: 'https://panel.example.com/done',
    });

    expect(result.redirectUrl).toContain('mock-gateway/pay');
    expect(result.gatewayToken).toBeTruthy();
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('verifies webhook signature', () => {
    const payload = {
      transactionId: 'txn-123',
      status: 'success' as const,
      amountRial: '5000000',
      referenceId: '00000000-0000-0000-0000-000000000010',
      cardMask: '****1234',
    };

    const signature = signMockPaymentGatewayPayload(payload, 'test-secret');

    expect(
      verifyMockPaymentGatewaySignature(payload, signature, 'test-secret', 'test'),
    ).toBe(true);
  });

  it('rejects invalid webhook signature', () => {
    const payload = {
      transactionId: 'txn-123',
      status: 'success' as const,
      amountRial: '5000000',
      referenceId: '00000000-0000-0000-0000-000000000010',
    };

    expect(() =>
      gateway.verifyWebhook({ 'x-gateway-signature': 'invalid' }, payload),
    ).toThrow('INVALID_WEBHOOK_SIGNATURE');
  });
});
