'use client';

import type { ImportCustomersResultDto } from '@hivork/contracts/customers';
import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { ImportDropzone } from '@/components/customers/import-dropzone';
import {
  ImportResultActions,
  ImportResultSummary,
  ImportResultTable,
} from '@/components/customers/import-result-table';
import { useApiError } from '@/hooks/use-api-error';
import { ApiClientError } from '@/lib/api/client';
import {
  createImportIdempotencyKey,
  uploadCustomersImport,
  type ImportUploadProgress,
} from '@/lib/api/upload-customers';

const TEMPLATE_HREF = '/templates/customer-import-template.xlsx';

type ImportPageState = 'idle' | 'uploading' | 'result' | 'error';

export default function CustomerImportPage() {
  return (
    <RequirePermission permission="installments.customer.import">
      <CustomerImportContent />
    </RequirePermission>
  );
}

function CustomerImportContent() {
  const { resolve } = useApiError();
  const abortRef = useRef<AbortController | null>(null);

  const [pageState, setPageState] = useState<ImportPageState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ImportUploadProgress | null>(null);
  const [result, setResult] = useState<ImportCustomersResultDto | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPageState('idle');
    setSelectedFile(null);
    setProgress(null);
    setResult(null);
    setUploadError(null);
    setValidationError(null);
    setSuccessBanner(null);
  }, []);

  const startUpload = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setPageState('uploading');
      setUploadError(null);
      setValidationError(null);
      setSuccessBanner(null);
      setProgress({ loaded: 0, total: file.size, percent: 0 });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await uploadCustomersImport(file, createImportIdempotencyKey(), {
          onProgress: setProgress,
          signal: controller.signal,
        });

        const data = response.data;
        setResult(data);
        setPageState('result');

        if (data.errorCount === 0) {
          setSuccessBanner('همه ردیف‌ها با موفقیت وارد شدند.');
        } else if (data.successCount === 0) {
          setSuccessBanner('هیچ ردیفی وارد نشد. خطاها را بررسی کنید.');
        } else {
          setSuccessBanner('بخشی از ردیف‌ها با خطا مواجه شدند.');
        }
      } catch (err) {
        if (err instanceof ApiClientError && err.code === 'IDEMPOTENCY_CONFLICT') {
          setUploadError('این درخواست قبلاً با فایل دیگری ثبت شده است. فایل جدید انتخاب کنید.');
        } else if (err instanceof ApiClientError && err.code === 'REQUEST_ABORTED') {
          setUploadError('آپلود لغو شد.');
        } else {
          setUploadError(err instanceof ApiClientError ? resolve(err) : 'آپلود فایل ناموفق بود.');
        }
        setPageState('error');
      } finally {
        abortRef.current = null;
      }
    },
    [resolve],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">ورود مشتریان از Excel</h1>
        <Button asChild variant="outline">
          <Link href="/admin/customers">بازگشت به لیست</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-fit">
          <a href={TEMPLATE_HREF} download>
            📥 دانلود فایل نمونه
          </a>
        </Button>
        <p className="text-xs text-neutral-500">
          ستون‌های الزامی: phone، name — اختیاری: local_code، notes
        </p>
      </div>

      {pageState === 'idle' || pageState === 'error' ? (
        <>
          <ImportDropzone
            validationError={validationError}
            onFileSelected={(file) => {
              setValidationError(null);
              void startUpload(file);
            }}
          />

          {selectedFile && pageState === 'error' ? (
            <p className="text-sm text-neutral-600">
              آخرین فایل: <span className="font-medium">{selectedFile.name}</span>
            </p>
          ) : null}

          {uploadError ? (
            <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{uploadError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedFile) {
                    void startUpload(selectedFile);
                  } else {
                    setPageState('idle');
                    setUploadError(null);
                  }
                }}
              >
                تلاش مجدد
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {pageState === 'uploading' ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <p className="text-sm text-neutral-700">
            در حال آپلود {selectedFile?.name ?? 'فایل'}…
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full bg-neutral-900 transition-all"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
          <p className="text-sm text-neutral-600">
            {formatPersianDigits(progress?.percent ?? 0)}٪
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              abortRef.current?.abort();
            }}
          >
            لغو آپلود
          </Button>
        </div>
      ) : null}

      {pageState === 'result' && result ? (
        <div className="flex flex-col gap-4">
          {successBanner ? (
            <p
              className={`rounded-md border px-4 py-3 text-sm ${
                result.errorCount === 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : result.successCount === 0
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
              role="status"
            >
              {successBanner}
            </p>
          ) : null}

          <ImportResultSummary
            totalRows={result.totalRows}
            successCount={result.successCount}
            errorCount={result.errorCount}
          />

          <ImportResultTable errors={result.errors} />

          <ImportResultActions onUploadAnother={reset} />
        </div>
      ) : null}
    </div>
  );
}
