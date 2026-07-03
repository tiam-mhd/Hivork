'use client';

import { useCallback, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import {
  applyDiscount,
  applyPenalty,
  deferInstallment,
  fetchPenaltyPreview,
  recordBankTransferPayment,
  recordCashPayment,
  recordCheckPayment,
  recordFeePayment,
  recordPosPayment,
  rescheduleInstallment,
  waiveInstallment,
} from '@/lib/api/installments';
import { ApiClientError } from '@/lib/api/client';

export function useInstallmentMutations() {
  const { resolve } = useApiError();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T>(action: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; message: string; code?: string }> => {
      setPending(true);
      try {
        const data = await action();
        return { ok: true, data };
      } catch (error) {
        const message = resolve(error);
        const code = error instanceof ApiClientError ? error.code : undefined;
        return { ok: false, message, code };
      } finally {
        setPending(false);
      }
    },
    [resolve],
  );

  return {
    pending,
    waive: (installmentId: string, input: Parameters<typeof waiveInstallment>[1]) =>
      run(() => waiveInstallment(installmentId, input)),
    penaltyPreview: (installmentId: string) => run(() => fetchPenaltyPreview(installmentId)),
    applyPenalty: (installmentId: string, input: Parameters<typeof applyPenalty>[1]) =>
      run(() => applyPenalty(installmentId, input)),
    applyDiscount: (installmentId: string, input: Parameters<typeof applyDiscount>[1]) =>
      run(() => applyDiscount(installmentId, input)),
    reschedule: (installmentId: string, input: Parameters<typeof rescheduleInstallment>[1]) =>
      run(() => rescheduleInstallment(installmentId, input)),
    defer: (installmentId: string, input: Parameters<typeof deferInstallment>[1]) =>
      run(() => deferInstallment(installmentId, input)),
    recordCash: (installmentId: string, input: Parameters<typeof recordCashPayment>[1]) =>
      run(() => recordCashPayment(installmentId, input)),
    recordBankTransfer: (
      installmentId: string,
      input: Parameters<typeof recordBankTransferPayment>[1],
    ) => run(() => recordBankTransferPayment(installmentId, input)),
    recordPos: (installmentId: string, input: Parameters<typeof recordPosPayment>[1]) =>
      run(() => recordPosPayment(installmentId, input)),
    recordCheck: (installmentId: string, input: Parameters<typeof recordCheckPayment>[1]) =>
      run(() => recordCheckPayment(installmentId, input)),
    recordFee: (installmentId: string, input: Parameters<typeof recordFeePayment>[1]) =>
      run(() => recordFeePayment(installmentId, input)),
  };
}
