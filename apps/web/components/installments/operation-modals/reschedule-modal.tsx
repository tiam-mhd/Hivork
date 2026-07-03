'use client';

import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useState } from 'react';

import { DatePicker } from '@/components/date-picker';
import { OperationDialog } from '@/components/installments/operation-modals/operation-dialog';
import { useInstallmentMutations } from '@/hooks/use-installment-mutations';

type RescheduleInstallmentModalProps = {
  open: boolean;
  installmentId: string;
  expectedVersion: number;
  currentDueDate: string;
  onClose: () => void;
  onSuccess: (version: number) => void;
  onError: (message: string, code?: string) => void;
};

export function RescheduleInstallmentModal({
  open,
  installmentId,
  expectedVersion,
  currentDueDate,
  onClose,
  onSuccess,
  onError,
}: RescheduleInstallmentModalProps) {
  const reasonId = useId();
  const { reschedule, pending } = useInstallmentMutations();
  const [newDueDate, setNewDueDate] = useState(currentDueDate.slice(0, 10));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewDueDate(currentDueDate.slice(0, 10));
      setReason('');
      setError(null);
    }
  }, [open, currentDueDate]);

  async function handleSubmit() {
    const result = await reschedule(installmentId, {
      newDueDate,
      reason: reason.trim() || undefined,
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
      title="جابجایی سررسید"
      description="تاریخ سررسید جدید را انتخاب کنید."
      loading={pending}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <DatePicker
          label="تاریخ سررسید جدید"
          value={newDueDate}
          onChange={(value) => setNewDueDate(value ?? newDueDate)}
          disabled={pending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>دلیل (اختیاری)</Label>
        <Input
          id={reasonId}
          value={reason}
          disabled={pending}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
        {pending ? 'در حال ثبت...' : 'ثبت تغییر'}
      </Button>
    </OperationDialog>
  );
}
