'use client';

import { useDeferredValue, useMemo } from 'react';

import {
  calculateInstallmentSchedule,
  sumInstallmentScheduleAmounts,
  type InstallmentScheduleItem,
} from '@hivork/domain/installments/browser';

import type { SaleFormValues } from '@/lib/schemas/sale-form.schema';
import { buildSalePreviewInput } from '@/lib/schemas/sale-form.schema';

export type InstallmentPreviewState = {
  items: InstallmentScheduleItem[];
  remainingRial: bigint;
  sumMatches: boolean;
  isReady: boolean;
};

const EMPTY_PREVIEW: InstallmentPreviewState = {
  items: [],
  remainingRial: 0n,
  sumMatches: false,
  isReady: false,
};

export function computeInstallmentPreview(values: SaleFormValues): InstallmentPreviewState {
  const input = buildSalePreviewInput(values);
  if (!input) {
    return EMPTY_PREVIEW;
  }

  const items = calculateInstallmentSchedule(input);
  const remainingRial = input.totalAmountRial - input.downPaymentRial;
  const sum = sumInstallmentScheduleAmounts(items);

  return {
    items,
    remainingRial,
    sumMatches: sum === remainingRial,
    isReady: true,
  };
}

export function useInstallmentPreview(values: SaleFormValues): InstallmentPreviewState {
  const deferredValues = useDeferredValue(values);

  return useMemo(() => computeInstallmentPreview(deferredValues), [deferredValues]);
}
