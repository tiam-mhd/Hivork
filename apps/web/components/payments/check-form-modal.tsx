'use client';

import type { CheckTypeDto } from '@hivork/contracts/payments';
import { Button, Input, Label, Textarea } from '@hivork/ui';
import { useEffect, useRef, useState } from 'react';

import { DatePicker } from '@/components/date-picker';
import { TomanInput } from '@/components/form/toman-input';
import { OperationDialog } from '@/components/installments/operation-modals/operation-dialog';
import { useApiError } from '@/hooks/use-api-error';
import { registerPayableCheck, registerReceivedCheck } from '@/lib/api/payments';
import { isoDateToCheckDueDateInput } from '@/lib/payments/check-dates';

type CheckFormModalProps = {
  open: boolean;
  mode: CheckTypeDto;
  onClose: () => void;
  onSuccess: () => void;
};

type FormState = {
  checkNumber: string;
  bankName: string;
  bankBranchCode: string;
  amountRial: string;
  dueDate: string;
  partyName: string;
  sayadId: string;
  note: string;
};

const EMPTY: FormState = {
  checkNumber: '',
  bankName: '',
  bankBranchCode: '',
  amountRial: '',
  dueDate: '',
  partyName: '',
  sayadId: '',
  note: '',
};

export function CheckFormModal({ open, mode, onClose, onSuccess }: CheckFormModalProps) {
  const { resolve } = useApiError();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialRef = useRef(JSON.stringify(EMPTY));

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setDirty(false);
      setError(null);
      initialRef.current = JSON.stringify(EMPTY);
    }
  }, [open, mode]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      setDirty(JSON.stringify(next) !== initialRef.current);
      return next;
    });
  }

  function handleClose() {
    if (pending) return;
    if (dirty && !window.confirm('تغییرات ذخیره نشده از بین می‌رود. بستن فرم؟')) {
      return;
    }
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    if (!form.checkNumber.trim() || !form.bankName.trim() || !form.partyName.trim()) {
      setError('فیلدهای الزامی را تکمیل کنید.');
      return;
    }
    if (!form.amountRial || BigInt(form.amountRial) <= 0n) {
      setError('مبلغ چک معتبر نیست.');
      return;
    }
    const dueDate = isoDateToCheckDueDateInput(form.dueDate);
    if (!dueDate) {
      setError('تاریخ سررسید معتبر نیست.');
      return;
    }

    setPending(true);
    try {
      const common = {
        checkNumber: form.checkNumber.trim(),
        bankName: form.bankName.trim(),
        bankBranchCode: form.bankBranchCode.trim() || undefined,
        amountRial: form.amountRial,
        dueDate,
        sayadId: form.sayadId.trim() || undefined,
        note: form.note.trim() || undefined,
      };

      if (mode === 'received') {
        await registerReceivedCheck({
          ...common,
          drawerName: form.partyName.trim(),
        });
      } else {
        await registerPayableCheck({
          ...common,
          payeeName: form.partyName.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  const title = mode === 'received' ? 'ثبت چک دریافتی' : 'ثبت چک پرداختی';
  const partyLabel = mode === 'received' ? 'نام صادرکننده' : 'نام گیرنده';

  return (
    <OperationDialog
      open={open}
      title={title}
      description="اطلاعات چک را مطابق مدارک بانکی وارد کنید."
      loading={pending}
      onClose={handleClose}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="check-number">شماره چک</Label>
          <Input
            id="check-number"
            value={form.checkNumber}
            disabled={pending}
            onChange={(event) => update('checkNumber', event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="bank-name">نام بانک</Label>
          <Input
            id="bank-name"
            value={form.bankName}
            disabled={pending}
            onChange={(event) => update('bankName', event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="bank-branch">کد شعبه (اختیاری)</Label>
          <Input
            id="bank-branch"
            value={form.bankBranchCode}
            disabled={pending}
            onChange={(event) => update('bankBranchCode', event.target.value)}
          />
        </div>
        <TomanInput
          label="مبلغ چک"
          value={form.amountRial}
          disabled={pending}
          required
          onChange={(value) => update('amountRial', value)}
        />
        <DatePicker
          label="تاریخ سررسید"
          value={form.dueDate}
          disabled={pending}
          required
          onChange={(value) => update('dueDate', value ?? '')}
        />
        <div>
          <Label htmlFor="party-name">{partyLabel}</Label>
          <Input
            id="party-name"
            value={form.partyName}
            disabled={pending}
            onChange={(event) => update('partyName', event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="sayad-id">شناسه صیاد (اختیاری)</Label>
          <Input
            id="sayad-id"
            value={form.sayadId}
            disabled={pending}
            onChange={(event) => update('sayadId', event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="check-note">یادداشت (اختیاری)</Label>
          <Textarea
            id="check-note"
            value={form.note}
            disabled={pending}
            onChange={(event) => update('note', event.target.value)}
            rows={3}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" disabled={pending} onClick={handleClose}>
            انصراف
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
            {pending ? 'در حال ثبت...' : 'ثبت چک'}
          </Button>
        </div>
      </div>
    </OperationDialog>
  );
}
