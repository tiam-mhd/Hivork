import type {
  UnifiedPaymentAttemptDto,
  UnifiedPaymentMethodDto,
  UnifiedPaymentResponseDto,
} from '@hivork/contracts/payments';
import { mapInternalMethodToUnified } from '@hivork/contracts/payments';

import type { PaymentAttemptDetailResult } from '../installments/payments/record-payment.helper.js';

export function mapDetailToUnifiedAttempt(
  detail: PaymentAttemptDetailResult,
  unifiedMethod?: UnifiedPaymentMethodDto,
): UnifiedPaymentAttemptDto {
  const metadata = detail.methodDetails ?? {};
  const unifiedMethodHint =
    typeof metadata.unifiedMethod === 'string'
      ? (metadata.unifiedMethod as UnifiedPaymentMethodDto)
      : undefined;

  const resolvedMethod =
    unifiedMethod ??
    mapInternalMethodToUnified(detail.method, unifiedMethodHint) ??
    'cash';

  return {
    id: detail.id,
    installmentId: detail.installmentId,
    amountRial: detail.amountRial.toString(),
    status: detail.status as UnifiedPaymentAttemptDto['status'],
    method: resolvedMethod,
    createdAt: detail.createdAt.toISOString(),
    version: detail.version,
  };
}

export function mapToUnifiedPaymentResponse(input: {
  paymentAttempt: PaymentAttemptDetailResult;
  unifiedMethod: UnifiedPaymentMethodDto;
  redirectUrl?: string | null;
  ledgerEntryId?: string;
}): UnifiedPaymentResponseDto {
  return {
    paymentAttempt: mapDetailToUnifiedAttempt(input.paymentAttempt, input.unifiedMethod),
    ...(input.ledgerEntryId ? { ledgerEntryId: input.ledgerEntryId } : {}),
    redirectUrl: input.redirectUrl ?? null,
  };
}
