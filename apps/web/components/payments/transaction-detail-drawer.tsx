'use client';

import type { PaymentTransactionListItemDto } from '@hivork/contracts/payments';
import { isoToJalaliDisplay } from '@hivork/i18n';
import { Button, Label, Textarea } from '@hivork/ui';
import { useState } from 'react';

import { TomanInput } from '@/components/form/toman-input';
import { PaymentsSideDrawer } from '@/components/payments/payments-side-drawer';
import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import { refundPaymentTransaction, voidPaymentTransaction } from '@/lib/api/payments';
import { formatToman } from '@/lib/i18n';
import {
  PAYMENT_ENTRY_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  paymentMethodLabel,
} from '@/lib/payments/payment-labels';

type TransactionDetailDrawerProps = {
  item: PaymentTransactionListItemDto | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export function TransactionDetailDrawer({
  item,
  open,
  onClose,
  onUpdated,
}: TransactionDetailDrawerProps) {
  const { resolve } = useApiError();
  const canRefund = usePermission('installments.payment.refund');
  const canVoid = usePermission('installments.payment.void');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!item) return null;

  async function handleRefund() {
    if (!item || !refundAmount || !refundReason.trim()) {
      setError('مبلغ و دلیل استرداد الزامی است.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await refundPaymentTransaction(
        item.id,
        { refundAmountRial: refundAmount, reason: refundReason.trim(), refundMethod: 'original' },
        crypto.randomUUID(),
      );
      setMessage('استرداد با موفقیت ثبت شد.');
      onUpdated();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  async function handleVoid() {
    if (!item || !voidReason.trim()) {
      setError('دلیل ابطال الزامی است.');
      return;
    }
    if (!window.confirm('آیا از ابطال این تراکنش مطمئن هستید؟')) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await voidPaymentTransaction(item.id, {
        voidReason: voidReason.trim(),
        expectedVersion: 1,
      });
      setMessage('تراکنش ابطال شد.');
      onUpdated();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <PaymentsSideDrawer
      open={open}
      title="جزئیات تراکنش"
      description={PAYMENT_ENTRY_TYPE_LABELS[item.entryType]}
      onClose={onClose}
    >
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">مبلغ</dt>
          <dd className="font-semibold tabular-nums">{formatToman(BigInt(item.amountRial))}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">وضعیت</dt>
          <dd>{PAYMENT_STATUS_LABELS[item.status]}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">روش</dt>
          <dd>{paymentMethodLabel(item.paymentMethod)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">تاریخ</dt>
          <dd>{isoToJalaliDisplay(item.occurredAt.slice(0, 10), 'fa', { persianDigits: true })}</dd>
        </div>
        {item.description ? (
          <div>
            <dt className="text-muted-foreground">توضیح</dt>
            <dd className="mt-1">{item.description}</dd>
          </div>
        ) : null}
      </dl>

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {item.status === 'posted' && canRefund ? (
        <section className="mt-6 space-y-3 rounded-xl border border-border p-4">
          <h3 className="font-medium">استرداد</h3>
          <TomanInput label="مبلغ استرداد" value={refundAmount} onChange={setRefundAmount} />
          <div>
            <Label htmlFor="refund-reason">دلیل</Label>
            <Textarea
              id="refund-reason"
              value={refundReason}
              disabled={pending}
              onChange={(event) => setRefundReason(event.target.value)}
              rows={2}
            />
          </div>
          <Button type="button" variant="outline" disabled={pending} onClick={() => void handleRefund()}>
            ثبت استرداد
          </Button>
        </section>
      ) : null}

      {item.status === 'posted' && canVoid ? (
        <section className="mt-4 space-y-3 rounded-xl border border-destructive/30 p-4">
          <h3 className="font-medium text-destructive">ابطال</h3>
          <div>
            <Label htmlFor="void-reason">دلیل ابطال</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              disabled={pending}
              onChange={(event) => setVoidReason(event.target.value)}
              rows={2}
            />
          </div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void handleVoid()}>
            ابطال تراکنش
          </Button>
        </section>
      ) : null}
    </PaymentsSideDrawer>
  );
}
