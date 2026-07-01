'use client';

import type { ImportCustomerRowErrorCodeDto } from '@hivork/contracts/customers';
import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';

import { maskPhone } from '@/lib/auth/phone-utils';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';

export type ImportResultRow = {
  row: number;
  phone: string | null;
  error: ImportCustomerRowErrorCodeDto;
};

type ImportResultTableProps = {
  errors: ImportResultRow[];
};

export function mapImportErrorMessage(code: ImportCustomerRowErrorCodeDto): string {
  return getErrorMessageFa(code);
}

export function ImportResultTable({ errors }: ImportResultTableProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-start text-neutral-600">
            <th className="px-3 py-2 font-medium">ردیف</th>
            <th className="px-3 py-2 font-medium">شماره</th>
            <th className="px-3 py-2 font-medium">خطا</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((item) => (
            <tr key={`${item.row}-${item.phone ?? 'none'}`} className="border-b border-neutral-100 last:border-0">
              <td className="px-3 py-2">{formatPersianDigits(item.row)}</td>
              <td className="px-3 py-2 font-mono" dir="ltr">
                {item.phone ? maskPhone(item.phone) : '—'}
              </td>
              <td className="px-3 py-2 text-red-700">{mapImportErrorMessage(item.error)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ImportResultSummaryProps = {
  totalRows: number;
  successCount: number;
  errorCount: number;
};

export function ImportResultSummary({ totalRows, successCount, errorCount }: ImportResultSummaryProps) {
  return (
    <div className="grid gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm sm:grid-cols-3">
      <p>
        <span className="text-neutral-600">کل ردیف‌ها: </span>
        <span className="font-semibold">{formatPersianDigits(totalRows)}</span>
      </p>
      <p>
        <span className="text-neutral-600">موفق: </span>
        <span className="font-semibold text-emerald-700">{formatPersianDigits(successCount)}</span>
      </p>
      <p>
        <span className="text-neutral-600">ناموفق: </span>
        <span className="font-semibold text-red-700">{formatPersianDigits(errorCount)}</span>
      </p>
    </div>
  );
}

type ImportResultActionsProps = {
  onUploadAnother: () => void;
};

export function ImportResultActions({ onUploadAnother }: ImportResultActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onUploadAnother}>
        ورود فایل جدید
      </Button>
      <Button asChild>
        <Link href="/admin/customers">بازگشت به لیست مشتریان</Link>
      </Button>
    </div>
  );
}
