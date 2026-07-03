'use client';

import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useState } from 'react';

import { TomanInput } from '@/components/form/toman-input';
import { OperationDialog } from '@/components/installments/operation-modals/operation-dialog';
import { useInstallmentMutations } from '@/hooks/use-installment-mutations';

type DiscountInstallmentModalProps = {
  open: boolean;
  installmentId: string;
  expectedVersion: number;
  maxAmountRial: string;
  onClose: () => void;
  onSuccess: (version: number) => void;
  onError: (message: string, code?: string) => void;
};

export function DiscountInstallmentModal({
  open,
  installmentId,
  expectedVersion,
  maxAmountRial,
  onClose,
  onSuccess,
  onError,
}: DiscountInstallmentModalProps) {
  const reasonId = useId();
  const { applyDiscount, pending } = useInstallmentMutations();
  const [reason, setReason] = useState('');
  const [discountRial, setDiscountRial] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setDiscountRial('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('دلیل تخفیف باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    if (!discountRial || BigInt(discountRial) <= 0n) {
      setError('مبلغ تخفیف باید بزرگ‌تر از صفر باشد.');
      return;
    }

    if (BigInt(discountRial) > BigInt(maxAmountRial)) {
      setError('مبلغ تخفیف از مبلغ قسط بیشتر است.');
      return;
    }

    const result = await applyDiscount(installmentId, {
      discountRial,
      reason: trimmed,
      expectedVersion,
    });

    if (!result.ok) {
      setError(result.message);
      onError(result.message, result.code);
      return;
    }

    onSuccess(result.data.installment.version);
    onClose();
  }

  return (
    <OperationDialog
      open={open}
      title="ثبت تخفیف"
      description="تخفیف مبلغ قسط را کاهش می‌دهد."
      loading={pending}
      onClose={onClose}
    >
      <TomanInput
        label="مبلغ تخفیف"
        value={discountRial}
        onChange={setDiscountRial}
        disabled={pending}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>دلیل تخفیف</Label>
        <Input
          id={reasonId}
          value={reason}
          placeholder="مثلاً تخفیف وفاداری"
          disabled={pending}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
        {pending ? 'در حال ثبت...' : 'ثبت تخفیف'}
      </Button>
    </OperationDialog>
  );
}
