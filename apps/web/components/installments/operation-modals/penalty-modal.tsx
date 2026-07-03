'use client';

import type { PenaltyPreviewResponseDto } from '@hivork/contracts/installments';
import { formatPersianDigits, formatToman } from '@hivork/i18n';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useState } from 'react';

import { TomanInput } from '@/components/form/toman-input';
import { OperationDialog } from '@/components/installments/operation-modals/operation-dialog';
import { useInstallmentMutations } from '@/hooks/use-installment-mutations';

type PenaltyInstallmentModalProps = {
  open: boolean;
  installmentId: string;
  expectedVersion: number;
  onClose: () => void;
  onSuccess: (version: number) => void;
  onError: (message: string, code?: string) => void;
};

export function PenaltyInstallmentModal({
  open,
  installmentId,
  expectedVersion,
  onClose,
  onSuccess,
  onError,
}: PenaltyInstallmentModalProps) {
  const reasonId = useId();
  const { penaltyPreview, applyPenalty, pending } = useInstallmentMutations();
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [reason, setReason] = useState('محاسبه خودکار جریمه');
  const [manualAmount, setManualAmount] = useState('');
  const [preview, setPreview] = useState<PenaltyPreviewResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode('auto');
      setReason('محاسبه خودکار جریمه');
      setManualAmount('');
      setPreview(null);
      setError(null);
      return;
    }

    void (async () => {
      const result = await penaltyPreview(installmentId);
      if (result.ok) {
        setPreview(result.data);
      }
    })();
  }, [open, installmentId, penaltyPreview]);

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('دلیل جریمه باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    const body =
      mode === 'auto'
        ? { mode: 'auto' as const, reason: trimmed, expectedVersion }
        : {
            mode: 'manual' as const,
            reason: trimmed,
            expectedVersion,
            amountRial: manualAmount,
          };

    if (mode === 'manual' && (!manualAmount || BigInt(manualAmount) <= 0n)) {
      setError('مبلغ جریمه باید بزرگ‌تر از صفر باشد.');
      return;
    }

    const result = await applyPenalty(installmentId, body);
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
      title="ثبت جریمه"
      description="جریمه فقط برای اقساط معوق قابل ثبت است."
      loading={pending}
      onClose={onClose}
    >
      {preview ? (
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p>روزهای تأخیر: {formatPersianDigits(preview.overdueDays)}</p>
          <p>روزهای مشمول: {formatPersianDigits(preview.chargeableDays)}</p>
          <p className="font-medium">
            جریمه محاسبه‌شده: {formatToman(BigInt(preview.calculatedPenaltyRial))}
          </p>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'auto' ? 'default' : 'outline'}
          onClick={() => setMode('auto')}
        >
          خودکار
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => setMode('manual')}
        >
          دستی
        </Button>
      </div>

      {mode === 'manual' ? (
        <TomanInput
          label="مبلغ جریمه"
          value={manualAmount}
          onChange={setManualAmount}
          disabled={pending}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>دلیل</Label>
        <Input
          id={reasonId}
          value={reason}
          disabled={pending}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
        {pending ? 'در حال ثبت...' : 'ثبت جریمه'}
      </Button>
    </OperationDialog>
  );
}
