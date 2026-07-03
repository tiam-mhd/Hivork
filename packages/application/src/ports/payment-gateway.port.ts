export type CreatePaymentGatewayInput = {
  tenantId: string;
  paymentAttemptId: string;
  installmentId: string;
  amountRial: bigint;
  returnUrl: string;
};

export type CreatePaymentGatewayResult = {
  redirectUrl: string;
  gatewayToken: string;
  expiresAt: Date;
};

export type VerifiedWebhookPayload = {
  transactionId: string;
  status: 'success' | 'failed';
  amountRial: bigint;
  referenceId: string;
  cardMask?: string;
  gateway: string;
};

export type RefundPaymentGatewayInput = {
  tenantId: string;
  paymentAttemptId: string;
  ledgerEntryId: string;
  amountRial: bigint;
  reason: string;
};

export type RefundPaymentGatewayResult = {
  gatewayRefundId: string;
};

export interface IPaymentGateway {
  readonly provider: string;
  createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult>;
  refundPayment(input: RefundPaymentGatewayInput): Promise<RefundPaymentGatewayResult>;
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): VerifiedWebhookPayload;
}

export interface IPaymentGatewayRegistry {
  get(provider: string): IPaymentGateway | null;
}

export const PAYMENT_GATEWAY_REGISTRY = Symbol('PAYMENT_GATEWAY_REGISTRY');
