'use client';

import type {
  ArchiveContractDto,
  CloseContractDto,
  CopyContractDto,
  ExtendContractDto,
  SaleDetailEnterpriseDto,
  TerminateContractDto,
} from '@hivork/contracts/installments';
import { Button, Input, Label } from '@hivork/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { DatePicker } from '@/components/date-picker';
import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import {
  archiveContract,
  closeContract,
  copyContract,
  extendContract,
  terminateContract,
} from '@/lib/api/contract-lifecycle';

type ContractLifecycleActionsProps = {
  sale: SaleDetailEnterpriseDto;
  onUpdated: () => Promise<void> | void;
  onToast: (message: string) => void;
};

type ActionKey = 'extend' | 'copy' | 'terminate' | 'close' | 'archive' | null;

function ActionButton({
  label,
  onClick,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={destructive ? 'border-destructive/40 text-destructive hover:bg-destructive/10' : ''}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function LifecycleDialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-2xl rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function ContractLifecycleActions({
  sale,
  onUpdated,
  onToast,
}: ContractLifecycleActionsProps) {
  const router = useRouter();
  const { resolve } = useApiError();
  const [activeDialog, setActiveDialog] = useState<ActionKey>(null);
  const [submitting, setSubmitting] = useState<ActionKey>(null);
  const [error, setError] = useState<string | null>(null);
  const [extendLastDueDate, setExtendLastDueDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [extendRegenerate, setExtendRegenerate] = useState(false);
  const [copyCustomerId, setCopyCustomerId] = useState('');
  const [copyBranchId, setCopyBranchId] = useState('');
  const [copyContractDate, setCopyContractDate] = useState('');
  const [copyFirstDueDate, setCopyFirstDueDate] = useState('');
  const [copyReason, setCopyReason] = useState('');
  const [copyAttachmentsFlag, setCopyAttachmentsFlag] = useState(false);
  const [copyGuarantorsFlag, setCopyGuarantorsFlag] = useState(true);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateDate, setTerminateDate] = useState('');
  const [terminateConfirmed, setTerminateConfirmed] = useState(false);
  const [terminateTyped, setTerminateTyped] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [closeWaiveRemaining, setCloseWaiveRemaining] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const canExtend = usePermission('installments.sale.extend');
  const canCopy = usePermission('installments.sale.copy');
  const canTerminate = usePermission('installments.sale.terminate');
  const canClose = usePermission('installments.sale.close');
  const canArchive = usePermission('installments.sale.archive');

  const typedConfirmPhrase = useMemo(
    () => sale.contractNumber?.trim() || sale.title?.trim() || sale.id.slice(0, 8),
    [sale.contractNumber, sale.id, sale.title],
  );

  const isReadOnly = sale.status === 'archived' || Boolean(sale.archivedAt);

  function resetTransientState() {
    setError(null);
  }

  function openDialog(action: Exclude<ActionKey, null>) {
    resetTransientState();
    setActiveDialog(action);
    if (action === 'copy') {
      setCopyContractDate(sale.contractDate?.slice(0, 10) ?? '');
      setCopyFirstDueDate(sale.firstDueDate?.slice(0, 10) ?? '');
    }
    if (action === 'extend') {
      setExtendLastDueDate(sale.firstDueDate?.slice(0, 10) ?? '');
    }
  }

  function closeDialog() {
    if (submitting) {
      return;
    }
    setActiveDialog(null);
    setError(null);
  }

  async function runAction<T>(
    action: Exclude<ActionKey, null>,
    work: () => Promise<T>,
    successMessage: string,
    afterSuccess?: (result: T) => Promise<void> | void,
  ) {
    setSubmitting(action);
    setError(null);
    try {
      const result = await work();
      await afterSuccess?.(result);
      await onUpdated();
      setActiveDialog(null);
      onToast(successMessage);
    } catch (err) {
      setError(resolve(err));
    } finally {
      setSubmitting(null);
    }
  }

  const reasonId = useId();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canExtend && !isReadOnly ? <ActionButton label="تمدید قرارداد" onClick={() => openDialog('extend')} /> : null}
        {canCopy ? <ActionButton label="کپی قرارداد" onClick={() => openDialog('copy')} /> : null}
        {canTerminate && !isReadOnly ? (
          <ActionButton label="فسخ قرارداد" destructive onClick={() => openDialog('terminate')} />
        ) : null}
        {canClose && !isReadOnly ? <ActionButton label="بستن قرارداد" onClick={() => openDialog('close')} /> : null}
        {canArchive && !isReadOnly ? (
          <ActionButton label="آرشیو قرارداد" destructive onClick={() => openDialog('archive')} />
        ) : null}
      </div>

      <LifecycleDialog
        open={activeDialog === 'extend'}
        title="تمدید قرارداد"
        description="تاریخ جدید و دلیل تمدید را وارد کنید."
        onClose={closeDialog}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <DatePicker
            value={extendLastDueDate || undefined}
            onChange={(value) => setExtendLastDueDate(value ?? '')}
            label="آخرین سررسید جدید"
            required
          />
          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={extendRegenerate}
              onChange={(event) => setExtendRegenerate(event.target.checked)}
            />
            بازتولید برنامه اقساط
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${reasonId}-extend`}>دلیل تمدید</Label>
          <Input
            id={`${reasonId}-extend`}
            value={extendReason}
            onChange={(event) => setExtendReason(event.target.value)}
            placeholder="مثال: توافق جدید با مشتری"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting === 'extend'}>
            انصراف
          </Button>
          <Button
            type="button"
            disabled={
              submitting === 'extend' || extendReason.trim().length < 3 || extendLastDueDate.trim().length === 0
            }
            onClick={() =>
              void runAction(
                'extend',
                () =>
                  extendContract(sale.id, {
                    newLastDueDate: extendLastDueDate,
                    reason: extendReason.trim(),
                    regenerateSchedule: extendRegenerate,
                  } satisfies ExtendContractDto),
                'قرارداد با موفقیت تمدید شد.',
              )
            }
          >
            {submitting === 'extend' ? 'در حال ثبت...' : 'ثبت تمدید'}
          </Button>
        </div>
      </LifecycleDialog>

      <LifecycleDialog
        open={activeDialog === 'copy'}
        title="کپی قرارداد"
        description="در صورت نیاز مشتری، شعبه و تاریخ‌های جدید را تنظیم کنید."
        onClose={closeDialog}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            value={copyCustomerId}
            onChange={(event) => setCopyCustomerId(event.target.value)}
            placeholder="شناسه مشتری مقصد (اختیاری)"
          />
          <Input
            value={copyBranchId}
            onChange={(event) => setCopyBranchId(event.target.value)}
            placeholder="شناسه شعبه مقصد (اختیاری)"
          />
          <DatePicker
            value={copyContractDate || undefined}
            onChange={(value) => setCopyContractDate(value ?? '')}
            label="تاریخ قرارداد"
            required
          />
          <DatePicker
            value={copyFirstDueDate || undefined}
            onChange={(value) => setCopyFirstDueDate(value ?? '')}
            label="تاریخ اولین قسط"
            required
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={copyAttachmentsFlag}
              onChange={(event) => setCopyAttachmentsFlag(event.target.checked)}
            />
            کپی پیوست‌ها
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={copyGuarantorsFlag}
              onChange={(event) => setCopyGuarantorsFlag(event.target.checked)}
            />
            کپی ضامنین
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${reasonId}-copy`}>دلیل کپی</Label>
          <Input
            id={`${reasonId}-copy`}
            value={copyReason}
            onChange={(event) => setCopyReason(event.target.value)}
            placeholder="مثال: تمدید فروش برای قرارداد جدید"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting === 'copy'}>
            انصراف
          </Button>
          <Button
            type="button"
            disabled={
              submitting === 'copy' ||
              copyReason.trim().length < 3 ||
              copyContractDate.trim().length === 0 ||
              copyFirstDueDate.trim().length === 0
            }
            onClick={() =>
              void runAction(
                'copy',
                () =>
                  copyContract(sale.id, {
                    tenantCustomerId: copyCustomerId.trim() || undefined,
                    branchId: copyBranchId.trim() || undefined,
                    contractDate: copyContractDate,
                    firstDueDate: copyFirstDueDate,
                    copyAttachments: copyAttachmentsFlag,
                    copyGuarantors: copyGuarantorsFlag,
                    reason: copyReason.trim(),
                  } satisfies CopyContractDto),
                'قرارداد کپی شد.',
                async (result) => {
                  router.push(`/admin/sales/${result.newSaleId}`);
                },
              )
            }
          >
            {submitting === 'copy' ? 'در حال کپی...' : 'ساخت قرارداد جدید'}
          </Button>
        </div>
      </LifecycleDialog>

      <LifecycleDialog
        open={activeDialog === 'terminate'}
        title="فسخ قرارداد"
        description="برای فسخ، دلیل را ثبت و تایید نهایی را انجام دهید."
        onClose={closeDialog}
      >
        <DatePicker
          value={terminateDate || undefined}
          onChange={(value) => setTerminateDate(value ?? '')}
          label="تاریخ موثر فسخ"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${reasonId}-terminate`}>دلیل فسخ</Label>
          <Input
            id={`${reasonId}-terminate`}
            value={terminateReason}
            onChange={(event) => setTerminateReason(event.target.value)}
            placeholder="مثال: عدم ایفای تعهدات"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={terminateConfirmed}
            onChange={(event) => setTerminateConfirmed(event.target.checked)}
          />
          فسخ قرارداد را تایید می‌کنم.
        </label>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${reasonId}-typed`}>برای تایید، عبارت زیر را وارد کنید</Label>
          <p className="rounded bg-muted px-3 py-2 text-sm font-medium">{typedConfirmPhrase}</p>
          <Input
            id={`${reasonId}-typed`}
            value={terminateTyped}
            onChange={(event) => setTerminateTyped(event.target.value)}
            placeholder={typedConfirmPhrase}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting === 'terminate'}>
            انصراف
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              submitting === 'terminate' ||
              terminateReason.trim().length < 3 ||
              !terminateConfirmed ||
              terminateTyped.trim() !== typedConfirmPhrase
            }
            onClick={() =>
              void runAction(
                'terminate',
                () =>
                  terminateContract(sale.id, {
                    reason: terminateReason.trim(),
                    effectiveDate: terminateDate.trim() || undefined,
                  } satisfies TerminateContractDto),
                'قرارداد با موفقیت فسخ شد.',
              )
            }
          >
            {submitting === 'terminate' ? 'در حال فسخ...' : 'تایید فسخ'}
          </Button>
        </div>
      </LifecycleDialog>

      <LifecycleDialog
        open={activeDialog === 'close'}
        title="بستن قرارداد"
        description="این عملیات قرارداد را به وضعیت بسته‌شده منتقل می‌کند."
        onClose={closeDialog}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${reasonId}-close`}>دلیل بستن</Label>
          <Input
            id={`${reasonId}-close`}
            value={closeReason}
            onChange={(event) => setCloseReason(event.target.value)}
            placeholder="مثال: پایان همکاری"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={closeWaiveRemaining}
            onChange={(event) => setCloseWaiveRemaining(event.target.checked)}
          />
          باقیمانده اقساط بخشوده شود
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting === 'close'}>
            انصراف
          </Button>
          <Button
            type="button"
            disabled={submitting === 'close' || closeReason.trim().length < 3}
            onClick={() =>
              void runAction(
                'close',
                () =>
                  closeContract(sale.id, {
                    reason: closeReason.trim(),
                    waiveRemaining: closeWaiveRemaining,
                  } satisfies CloseContractDto),
                'قرارداد بسته شد.',
              )
            }
          >
            {submitting === 'close' ? 'در حال ثبت...' : 'بستن قرارداد'}
          </Button>
        </div>
      </LifecycleDialog>

      <LifecycleDialog
        open={activeDialog === 'archive'}
        title="آرشیو قرارداد"
        description="قرارداد به حالت فقط‌خواندنی منتقل می‌شود."
        onClose={closeDialog}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${reasonId}-archive`}>دلیل آرشیو</Label>
          <Input
            id={`${reasonId}-archive`}
            value={archiveReason}
            onChange={(event) => setArchiveReason(event.target.value)}
            placeholder="مثال: پایان فرایند رسیدگی"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting === 'archive'}>
            انصراف
          </Button>
          <Button
            type="button"
            disabled={submitting === 'archive' || archiveReason.trim().length < 3}
            onClick={() =>
              void runAction(
                'archive',
                () => archiveContract(sale.id, { reason: archiveReason.trim() } satisfies ArchiveContractDto),
                'قرارداد بایگانی شد.',
              )
            }
          >
            {submitting === 'archive' ? 'در حال ثبت...' : 'آرشیو قرارداد'}
          </Button>
        </div>
      </LifecycleDialog>
    </>
  );
}
