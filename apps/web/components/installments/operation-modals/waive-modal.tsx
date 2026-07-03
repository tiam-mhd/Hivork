'use client';

import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useState } from 'react';

import { OperationDialog } from '@/components/installments/operation-modals/operation-dialog';
import { useInstallmentMutations } from '@/hooks/use-installment-mutations';

type WaiveInstallmentModalProps = {
  open: boolean;
  installmentId: string;
  expectedVersion: number;
  onClose: () => void;
  onSuccess: (version: number) => void;
  onError: (message: string, code?: string) => void;
};

export function WaiveInstallmentModal({
  open,
  installmentId,
  expectedVersion,
  onClose,
  onSuccess,
  onError,
}: WaiveInstallmentModalProps) {
  const reasonId = useId();
  const { waive, pending } = useInstallmentMutations();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('دلیل بخشودگی باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    const result = await waive(installmentId, {
      waiveReason: trimmed,
      expectedVersion,
      rejectPendingPayments: true,
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
      title="بخشودگی قسط"
      description="با بخشودگی، قسط به‌صورت نهایی از محاسبات خارج می‌شود."
      loading={pending}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>دلیل بخشودگی</Label>
        <Input
          id={reasonId}
          value={reason}
          placeholder="مثلاً توافق با مشتری"
          disabled={pending}
          onChange={(event) => setReason(event.target.value)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
        {pending ? 'در حال ثبت...' : 'تأیید بخشودگی'}
      </Button>
    </OperationDialog>
  );
}
