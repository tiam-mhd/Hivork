import type {
  ApplyDiscountDto,
  ApplyPenaltyDto,
  ConfirmPaymentDto,
  DeferInstallmentDto,
  InstallmentListResponseDto,
  ListInstallmentsQueryDto,
  PenaltyPreviewResponseDto,
  RejectPaymentDto,
  RescheduleInstallmentDto,
  VoidPaymentDto,
  WaiveInstallmentDto,
  RecordBankTransferPaymentBodyDto,
  RecordCashManualPaymentBodyDto,
  RecordCheckPaymentBodyDto,
  RecordFeePaymentBodyDto,
  RecordPosPaymentBodyDto,
} from '@hivork/contracts/installments';

import { apiFetch } from '@/lib/api/client';

export type InstallmentsListResponse = InstallmentListResponseDto;

export async function fetchInstallmentsList(
  query: string,
): Promise<InstallmentsListResponse> {
  return apiFetch<InstallmentsListResponse>(`/installments${query}`);
}

export async function fetchPenaltyPreview(
  installmentId: string,
): Promise<PenaltyPreviewResponseDto> {
  return apiFetch<PenaltyPreviewResponseDto>(
    `/installments/${installmentId}/penalty/preview`,
  );
}

export async function waiveInstallment(
  installmentId: string,
  body: WaiveInstallmentDto,
): Promise<{ installment: { id: string; status: 'waived'; version: number }; remainingRial: string }> {
  return apiFetch(`/installments/${installmentId}/waive`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function applyPenalty(
  installmentId: string,
  body: ApplyPenaltyDto,
): Promise<{
  installment: { id: string; amountRial: string; version: number };
  adjustment: { id: string; amountRial: string };
  remainingRial: string;
}> {
  return apiFetch(`/installments/${installmentId}/penalty`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function applyDiscount(
  installmentId: string,
  body: ApplyDiscountDto,
): Promise<{
  installment: { id: string; amountRial: string; version: number };
  adjustment: { id: string; adjustmentType: 'discount'; amountRial: string };
}> {
  return apiFetch(`/installments/${installmentId}/discount`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function rescheduleInstallment(
  installmentId: string,
  body: RescheduleInstallmentDto,
): Promise<{ installment: { id: string; version: number } }> {
  return apiFetch(`/installments/${installmentId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deferInstallment(
  installmentId: string,
  body: DeferInstallmentDto,
): Promise<{ installment: { id: string; version: number } }> {
  return apiFetch(`/installments/${installmentId}/defer`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function recordCashPayment(
  installmentId: string,
  body: RecordCashManualPaymentBodyDto,
): Promise<{ paymentAttempt: { id: string; status: string } }> {
  return apiFetch(`/installments/${installmentId}/payments/cash`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function recordBankTransferPayment(
  installmentId: string,
  body: RecordBankTransferPaymentBodyDto,
): Promise<{ paymentAttempt: { id: string; status: string } }> {
  return apiFetch(`/installments/${installmentId}/payments/bank-transfer`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function recordPosPayment(
  installmentId: string,
  body: RecordPosPaymentBodyDto,
): Promise<{ paymentAttempt: { id: string; status: string } }> {
  return apiFetch(`/installments/${installmentId}/payments/pos`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function recordCheckPayment(
  installmentId: string,
  body: RecordCheckPaymentBodyDto,
): Promise<{ paymentAttempt: { id: string; status: string } }> {
  return apiFetch(`/installments/${installmentId}/payments/check`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function recordFeePayment(
  installmentId: string,
  body: RecordFeePaymentBodyDto,
): Promise<{ paymentAttempt: { id: string; status: string } }> {
  return apiFetch(`/installments/${installmentId}/payments/fee`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function confirmPayment(
  attemptId: string,
  body: ConfirmPaymentDto,
): Promise<{ installment: { id: string; version: number } }> {
  return apiFetch(`/payment-attempts/${attemptId}/confirm`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function rejectPayment(
  attemptId: string,
  body: RejectPaymentDto,
): Promise<{ paymentAttempt: { id: string; status: string } }> {
  return apiFetch(`/payment-attempts/${attemptId}/reject`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function voidPayment(
  attemptId: string,
  body: VoidPaymentDto,
): Promise<{ paymentAttempt: { id: string; status: string } }> {
  return apiFetch(`/payment-attempts/${attemptId}/void`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function paymentReceiptPdfUrl(attemptId: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
  return `${base.replace(/\/$/, '')}/payment-attempts/${attemptId}/receipt/pdf`;
}

export type ListInstallmentsFilters = Partial<
  Pick<ListInstallmentsQueryDto, 'status' | 'branchId' | 'saleId' | 'from' | 'to' | 'sort' | 'limit'>
>;
