'use client';

import type { CheckSummaryDto } from '@hivork/contracts/payments';
import { Button, Input, Label, Textarea } from '@hivork/ui';
import { useState } from 'react';

import { OperationDialog } from '@/components/installments/operation-modals/operation-dialog';
import { useApiError } from '@/hooks/use-api-error';
import { bounceCheck, collectCheck, transferCheck } from '@/lib/api/payments';

type CollectCheckDialogProps = {
  check: CheckSummaryDto | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CollectCheckDialog({ check, open, onClose, onSuccess }: CollectCheckDialogProps) {
  const { resolve } = useApiError();
  const [bankDepositRef, setBankDepositRef] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!check) return;
    setPending(true);
    setError(null);
    try {
      await collectCheck(
        check.id,
        {
          bankDepositRef: bankDepositRef.trim() || undefined,
          confirmInstallment: true,
        },
        crypto.randomUUID(),
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <OperationDialog
      open={open}
      title="وصول چک"
      description={`چک ${check?.checkNumber ?? ''} وصول و در دفتر کل ثبت می‌شود.`}
      loading={pending}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="deposit-ref">شماره واریز بانکی (اختیاری)</Label>
          <Input
            id="deposit-ref"
            value={bankDepositRef}
            disabled={pending}
            onChange={(event) => setBankDepositRef(event.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" disabled={pending} onClick={() => void submit()}>
          {pending ? 'در حال وصول...' : 'تأیید وصول'}
        </Button>
      </div>
    </OperationDialog>
  );
}

type BounceCheckDialogProps = {
  check: CheckSummaryDto | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function BounceCheckDialog({ check, open, onClose, onSuccess }: BounceCheckDialogProps) {
  const { resolve } = useApiError();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!check) return;
    if (!reason.trim()) {
      setError('دلیل برگشت الزامی است.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await bounceCheck(check.id, { bounceReason: reason.trim() });
      onSuccess();
      onClose();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <OperationDialog
      open={open}
      title="برگشت چک"
      description="این عملیات برگشت چک را در سیستم ثبت می‌کند."
      loading={pending}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="bounce-reason">دلیل برگشت</Label>
          <Textarea
            id="bounce-reason"
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" variant="destructive" disabled={pending} onClick={() => void submit()}>
          {pending ? 'در حال ثبت...' : 'ثبت برگشت'}
        </Button>
      </div>
    </OperationDialog>
  );
}

type TransferCheckDialogProps = {
  check: CheckSummaryDto | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function TransferCheckDialog({ check, open, onClose, onSuccess }: TransferCheckDialogProps) {
  const { resolve } = useApiError();
  const [transferredTo, setTransferredTo] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!check) return;
    if (!transferredTo.trim()) {
      setError('نام گیرنده انتقال الزامی است.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await transferCheck(check.id, {
        transferredTo: transferredTo.trim(),
        transferReason: transferReason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <OperationDialog
      open={open}
      title="انتقال چک"
      description="چک به شخص یا بانک third party منتقل می‌شود."
      loading={pending}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="transfer-to">انتقال به</Label>
          <Input
            id="transfer-to"
            value={transferredTo}
            disabled={pending}
            onChange={(event) => setTransferredTo(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="transfer-reason">دلیل (اختیاری)</Label>
          <Textarea
            id="transfer-reason"
            value={transferReason}
            disabled={pending}
            onChange={(event) => setTransferReason(event.target.value)}
            rows={2}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" disabled={pending} onClick={() => void submit()}>
          {pending ? 'در حال انتقال...' : 'ثبت انتقال'}
        </Button>
      </div>
    </OperationDialog>
  );
}
