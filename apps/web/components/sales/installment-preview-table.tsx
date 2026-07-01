'use client';

import { formatPersianDigits, formatToman } from '@hivork/i18n';

import type { InstallmentPreviewState } from '@/hooks/use-installment-preview';
import { formatIsoDateAsJalali } from '@/lib/i18n';

type InstallmentPreviewTableProps = {
  preview: InstallmentPreviewState;
  showSumRow?: boolean;
};

export function InstallmentPreviewTable({
  preview,
  showSumRow = true,
}: InstallmentPreviewTableProps) {
  if (!preview.isReady || preview.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600">
        برای پیش‌نمایش اقساط، مبلغ کل، تعداد اقساط و تاریخ قسط اول را وارد کنید.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[24rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-start text-neutral-600">
              <th className="px-3 py-2 font-medium">قسط</th>
              <th className="px-3 py-2 font-medium">مبلغ</th>
              <th className="px-3 py-2 font-medium">سررسید</th>
            </tr>
          </thead>
          <tbody>
            {preview.items.map((item) => (
              <tr key={item.sequenceNumber} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2 text-neutral-900">
                  {formatPersianDigits(item.sequenceNumber)}
                </td>
                <td className="px-3 py-2 text-neutral-900">
                  {formatToman(item.amountRial)}
                </td>
                <td className="px-3 py-2 text-neutral-700">
                  {formatIsoDateAsJalali(item.dueDate.toISOString().slice(0, 10))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showSumRow ? (
        <p className="text-sm text-neutral-700">
          جمع اقساط: {formatToman(preview.remainingRial)}{' '}
          <span aria-label={preview.sumMatches ? 'جمع صحیح است' : 'جمع نادرست است'}>
            {preview.sumMatches ? '✓' : '✗'}
          </span>
        </p>
      ) : null}
    </div>
  );
}
