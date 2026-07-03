'use client';

import { Button, Label } from '@hivork/ui';
import { useEffect, useState } from 'react';

import { TomanInput } from '@/components/form/toman-input';
import { OperationDialog } from '@/components/installments/operation-modals/operation-dialog';
import { useInstallmentMutations } from '@/hooks/use-installment-mutations';

type PaymentMethodTab = 'cash' | 'bank' | 'pos' | 'check' | 'fee';

type PaymentRecordingWizardProps = {
  open: boolean;
  installmentId: string;
  defaultAmountRial: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function PaymentRecordingWizard({
  open,
  installmentId,
  defaultAmountRial,
  onClose,
  onSuccess,
  onError,
}: PaymentRecordingWizardProps) {
  const { recordCash, recordBankTransfer, recordPos, recordCheck, recordFee, pending } =
    useInstallmentMutations();
  const [tab, setTab] = useState<PaymentMethodTab>('cash');
  const [amountRial, setAmountRial] = useState(defaultAmountRial);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab('cash');
      setAmountRial(defaultAmountRial);
      setNote('');
      setError(null);
    }
  }, [open, defaultAmountRial]);

  async function handleSubmit() {
    if (!amountRial || BigInt(amountRial) <= 0n) {
      setError('مبلغ پرداخت باید بزرگ‌تر از صفر باشد.');
      return;
    }

    const base = { amountRial, note: note.trim() || undefined };
    let result;

    switch (tab) {
      case 'cash':
        result = await recordCash(installmentId, base);
        break;
      case 'bank':
        result = await recordBankTransfer(installmentId, {
          ...base,
          bankName: 'بانک',
          referenceNumber: `REF-${Date.now()}`,
          transferDate: new Date().toISOString().slice(0, 10),
        });
        break;
      case 'pos':
        result = await recordPos(installmentId, {
          ...base,
          terminalId: 'POS-1',
          traceNumber: `TR-${Date.now()}`,
        });
        break;
      case 'check':
        result = await recordCheck(installmentId, {
          ...base,
          checkNumber: `CH-${Date.now()}`,
          bankName: 'بانک',
          dueDate: new Date().toISOString().slice(0, 10),
          drawerName: 'صادرکننده',
        });
        break;
      case 'fee':
        result = await recordFee(installmentId, {
          ...base,
          feeType: 'service_fee',
          feeDescription: note.trim() || 'هزینه خدمات',
        });
        break;
      default:
        return;
    }

    if (!result.ok) {
      setError(result.message);
      onError(result.message);
      return;
    }

    onSuccess();
    onClose();
  }

  const tabs: Array<{ id: PaymentMethodTab; label: string }> = [
    { id: 'cash', label: 'نقد' },
    { id: 'bank', label: 'حواله' },
    { id: 'pos', label: 'POS' },
    { id: 'check', label: 'چک' },
    { id: 'fee', label: 'هزینه' },
  ];

  return (
    <OperationDialog
      open={open}
      title="ثبت پرداخت"
      description="پرداخت در وضعیت «در انتظار تأیید» ثبت می‌شود."
      loading={pending}
      onClose={onClose}
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={tab === item.id ? 'default' : 'outline'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <TomanInput
        label="مبلغ پرداخت"
        value={amountRial}
        onChange={setAmountRial}
        disabled={pending}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="payment-note">یادداشت</Label>
        <textarea
          id="payment-note"
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={note}
          disabled={pending}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
        {pending ? 'در حال ثبت...' : 'ثبت پرداخت'}
      </Button>
    </OperationDialog>
  );
}
