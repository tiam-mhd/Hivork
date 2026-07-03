import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  CreatePaymentGatewayInput,
  CreatePaymentGatewayResult,
  IPaymentGateway,
  IPaymentGatewayRegistry,
  RefundPaymentGatewayInput,
  RefundPaymentGatewayResult,
  VerifiedWebhookPayload,
} from '@hivork/application';

import { PaymentGatewayWebhookSchema } from '@hivork/contracts/installments';
import { Injectable } from '@nestjs/common';

export const MOCK_PAYMENT_GATEWAY_PROVIDER = 'mock';

export type MockPaymentGatewayOptions = {
  webhookSecret: string;
  publicApiBaseUrl: string;
  sessionTtlMs?: number;
  nodeEnv?: string;
};

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function signMockPaymentGatewayPayload(
  payload: Record<string, unknown>,
  secret: string,
): string {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

export function verifyMockPaymentGatewaySignature(
  payload: Record<string, unknown>,
  signature: string | undefined,
  secret: string,
  nodeEnv = 'production',
): boolean {
  if (!signature) {
    return nodeEnv === 'development' && secret.length === 0;
  }

  if (nodeEnv === 'development' && signature === 'dev') {
    return true;
  }

  if (!secret) {
    return false;
  }

  const expected = signMockPaymentGatewayPayload(payload, secret);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

@Injectable()
export class MockPaymentGateway implements IPaymentGateway {
  readonly provider = MOCK_PAYMENT_GATEWAY_PROVIDER;

  constructor(private readonly options: MockPaymentGatewayOptions) {}

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    const gatewayToken = randomUUID();
    const expiresAt = new Date(Date.now() + (this.options.sessionTtlMs ?? 15 * 60 * 1000));
    const redirectUrl = new URL('/mock-gateway/pay', this.options.publicApiBaseUrl);
    redirectUrl.searchParams.set('token', gatewayToken);
    redirectUrl.searchParams.set('referenceId', input.paymentAttemptId);

    return {
      redirectUrl: redirectUrl.toString(),
      gatewayToken,
      expiresAt,
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): VerifiedWebhookPayload {
    const parsed = PaymentGatewayWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error('INVALID_WEBHOOK_PAYLOAD');
    }

    const signature = headerValue(headers, 'x-gateway-signature');
    const isValid = verifyMockPaymentGatewaySignature(
      parsed.data,
      signature,
      this.options.webhookSecret,
      this.options.nodeEnv,
    );

    if (!isValid) {
      throw new Error('INVALID_WEBHOOK_SIGNATURE');
    }

    return {
      transactionId: parsed.data.transactionId,
      status: parsed.data.status,
      amountRial: BigInt(parsed.data.amountRial),
      referenceId: parsed.data.referenceId,
      cardMask: parsed.data.cardMask,
      gateway: this.provider,
    };
  }

  async refundPayment(input: RefundPaymentGatewayInput): Promise<RefundPaymentGatewayResult> {
    return {
      gatewayRefundId: `mock-refund-${input.ledgerEntryId.slice(0, 8)}`,
    };
  }
}

export class MockPaymentGatewayRegistry implements IPaymentGatewayRegistry {
  constructor(private readonly gateways: Map<string, IPaymentGateway>) {}

  get(provider: string): IPaymentGateway | null {
    return this.gateways.get(provider) ?? null;
  }
}
