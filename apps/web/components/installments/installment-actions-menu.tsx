'use client';

import { Button } from '@hivork/ui';
import { useMemo, useState } from 'react';

import { DiscountInstallmentModal } from '@/components/installments/operation-modals/discount-modal';
import { PenaltyInstallmentModal } from '@/components/installments/operation-modals/penalty-modal';
import { RescheduleInstallmentModal } from '@/components/installments/operation-modals/reschedule-modal';
import { WaiveInstallmentModal } from '@/components/installments/operation-modals/waive-modal';
import { PaymentRecordingWizard } from '@/components/installments/payment-recording-wizard';
import type { InstallmentDetailView } from '@/hooks/use-installment-detail';
import { usePermission } from '@/hooks/use-permission';

type ActionKey =
  | 'reschedule'
  | 'recordPayment'
  | 'waive'
  | 'penalty'
  | 'discount'
  | null;

type InstallmentActionsMenuProps = {
  detail: InstallmentDetailView;
  version: number;
  onRefresh: () => void;
  onVersionChange: (version: number) => void;
  onToast: (message: string) => void;
};

function isTerminalStatus(status: string): boolean {
  return status === 'paid' || status === 'waived';
}

export function InstallmentActionsMenu({
  detail,
  version,
  onRefresh,
  onVersionChange,
  onToast,
}: InstallmentActionsMenuProps) {
  const [activeAction, setActiveAction] = useState<ActionKey>(null);

  const canReschedule = usePermission('installments.installment.reschedule');
  const canRecordPayment = usePermission('installments.payment.report');
  const canWaive = usePermission('installments.installment.waive');
  const canPenalty = usePermission('installments.installment.penalty');
  const canDiscount = usePermission('installments.installment.discount');

  const terminal = isTerminalStatus(detail.installment.status);
  const canOperate = !terminal && detail.sale.status === 'active';

  const actions = useMemo(
    () =>
      [
        canReschedule && canOperate
          ? { key: 'reschedule' as const, label: 'جابجایی سررسید' }
          : null,
        canRecordPayment && canOperate
          ? { key: 'recordPayment' as const, label: 'ثبت پرداخت' }
          : null,
        canWaive && canOperate && detail.installment.status !== 'paid'
          ? { key: 'waive' as const, label: 'بخشودگی' }
          : null,
        canPenalty && detail.installment.status === 'overdue'
          ? { key: 'penalty' as const, label: 'ثبت جریمه' }
          : null,
        canDiscount && canOperate
          ? { key: 'discount' as const, label: 'ثبت تخفیف' }
          : null,
      ].filter(Boolean),
    [
      canDiscount,
      canOperate,
      canPenalty,
      canRecordPayment,
      canReschedule,
      canWaive,
      detail.installment.status,
    ],
  );

  function handleMutationError(message: string, code?: string) {
    if (code === 'VERSION_CONFLICT') {
      onToast('قسط توسط کاربر دیگری به‌روزرسانی شد. در حال بارگذاری مجدد...');
      onRefresh();
      return;
    }

    onToast(message);
  }

  function handleSuccess(nextVersion: number, message: string) {
    onVersionChange(nextVersion);
    onToast(message);
    onRefresh();
  }

  if (actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {terminal ? 'برای قسط‌های پرداخت‌شده یا بخشوده‌شده عملیاتی وجود ندارد.' : 'عملیاتی در دسترس نیست.'}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) =>
          action ? (
            <Button
              key={action.key}
              type="button"
              variant="outline"
              onClick={() => setActiveAction(action.key)}
            >
              {action.label}
            </Button>
          ) : null,
        )}
      </div>

      <RescheduleInstallmentModal
        open={activeAction === 'reschedule'}
        installmentId={detail.installment.id}
        expectedVersion={version}
        currentDueDate={detail.installment.dueDate}
        onClose={() => setActiveAction(null)}
        onSuccess={(next) => handleSuccess(next, 'تاریخ سررسید به‌روزرسانی شد.')}
        onError={handleMutationError}
      />

      <PaymentRecordingWizard
        open={activeAction === 'recordPayment'}
        installmentId={detail.installment.id}
        defaultAmountRial={detail.installment.amountRial}
        onClose={() => setActiveAction(null)}
        onSuccess={() => {
          onToast('پرداخت با موفقیت ثبت شد.');
          onRefresh();
        }}
        onError={(message) => onToast(message)}
      />

      <WaiveInstallmentModal
        open={activeAction === 'waive'}
        installmentId={detail.installment.id}
        expectedVersion={version}
        onClose={() => setActiveAction(null)}
        onSuccess={(next) => handleSuccess(next, 'بخشودگی قسط ثبت شد.')}
        onError={handleMutationError}
      />

      <PenaltyInstallmentModal
        open={activeAction === 'penalty'}
        installmentId={detail.installment.id}
        expectedVersion={version}
        onClose={() => setActiveAction(null)}
        onSuccess={(next) => handleSuccess(next, 'جریمه ثبت شد.')}
        onError={handleMutationError}
      />

      <DiscountInstallmentModal
        open={activeAction === 'discount'}
        installmentId={detail.installment.id}
        expectedVersion={version}
        maxAmountRial={detail.installment.amountRial}
        onClose={() => setActiveAction(null)}
        onSuccess={(next) => handleSuccess(next, 'تخفیف ثبت شد.')}
        onError={handleMutationError}
      />
    </>
  );
}
