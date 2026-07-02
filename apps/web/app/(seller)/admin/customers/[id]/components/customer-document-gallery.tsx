'use client';

import type { CustomerDocumentDto, CustomerDocumentTypeDto } from '@hivork/contracts/customers';
import { formatIsoDateAsJalali, formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DocumentPreviewLightbox } from './document-preview-lightbox';
import { DocumentThumbnail } from './document-thumbnail';
import { DocumentUploadZone } from './document-upload-zone';

import { BulkConfirmDialog } from '@/components/data-table/bulk-confirm-dialog';
import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import { ApiClientError } from '@/lib/api/client';
import {
  deleteCustomerDocument,
  getCustomerDocumentDownloadUrl,
  listCustomerDocuments,
  uploadCustomerDocument,
} from '@/lib/api/customer-documents';
import {
  CUSTOMER_DOCUMENT_TYPE_LABELS,
  CUSTOMER_DOCUMENT_TYPE_OPTIONS,
} from '@/lib/customers/customer-document-labels';


type CustomerDocumentGalleryProps = {
  customerId: string;
  active: boolean;
  onToast?: (message: string) => void;
};

type FilterValue = 'all' | CustomerDocumentTypeDto;

function formatFileSize(sizeBytes: string): string {
  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${formatPersianDigits(bytes)} بایت`;
  }
  if (bytes < 1024 * 1024) {
    return `${formatPersianDigits(Math.round(bytes / 1024))} کیلوبایت`;
  }
  return `${formatPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

function isImageMime(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/png';
}

export function CustomerDocumentGallery({
  customerId,
  active,
  onToast,
}: CustomerDocumentGalleryProps) {
  const { resolve } = useApiError();
  const canUpload = usePermission('installments.customer.document.upload');
  const canDelete = usePermission('installments.customer.document.delete');
  const canView = usePermission('installments.customer.view');

  const [documents, setDocuments] = useState<CustomerDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<CustomerDocumentTypeDto>('national_id');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomerDocumentDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const filterOptions = useMemo(
    () => [{ value: 'all' as const, label: 'همه' }, ...CUSTOMER_DOCUMENT_TYPE_OPTIONS],
    [],
  );

  const filteredDocuments = useMemo(() => {
    if (filter === 'all') {
      return documents;
    }
    return documents.filter((document) => document.documentType === filter);
  }, [documents, filter]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await listCustomerDocuments(customerId);
      setDocuments(items);
    } catch (err) {
      setError(err instanceof ApiClientError ? resolve(err) : 'بارگذاری مدارک ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [customerId, resolve]);

  useEffect(() => {
    if (active && canView) {
      void loadDocuments();
    }
  }, [active, canView, loadDocuments]);

  async function resolveDownloadUrl(document: CustomerDocumentDto, retry = false): Promise<string> {
    try {
      const result = await getCustomerDocumentDownloadUrl(customerId, document.id);
      return result.url;
    } catch (err) {
      if (!retry && err instanceof ApiClientError && (err.httpStatus === 403 || err.httpStatus === 410)) {
        return resolveDownloadUrl(document, true);
      }
      throw err;
    }
  }

  async function handleOpenDocument(document: CustomerDocumentDto) {
    setOpeningId(document.id);
    try {
      const url = await resolveDownloadUrl(document);
      if (isImageMime(document.mimeType)) {
        setPreview({ title: document.originalFileName, url });
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      onToast?.(err instanceof ApiClientError ? resolve(err) : 'باز کردن فایل ناموفق بود.');
    } finally {
      setOpeningId(null);
    }
  }

  async function handleUpload() {
    if (!selectedFile || !canUpload) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      await uploadCustomerDocument(
        customerId,
        {
          file: selectedFile,
          documentType,
          description: description.trim() || undefined,
        },
        {
          onProgress: (progress) => setUploadProgress(progress.percent),
        },
      );

      setSelectedFile(null);
      setDescription('');
      setUploadProgress(null);
      onToast?.('مدرک با موفقیت آپلود شد.');
      await loadDocuments();
    } catch (err) {
      setUploadError(err instanceof ApiClientError ? resolve(err) : 'آپلود مدرک ناموفق بود.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await deleteCustomerDocument(customerId, deleteTarget.id);
      setDeleteTarget(null);
      onToast?.('مدرک حذف شد.');
      await loadDocuments();
    } catch (err) {
      onToast?.(err instanceof ApiClientError ? resolve(err) : 'حذف مدرک ناموفق بود.');
    } finally {
      setDeleting(false);
    }
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        شما مجوز مشاهده مدارک مشتری را ندارید.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DocumentUploadZone
        readOnly={!canUpload}
        disabled={uploading}
        loading={uploading}
        progressPercent={uploadProgress}
        selectedFile={selectedFile}
        onFileSelected={setSelectedFile}
        documentType={documentType}
        onDocumentTypeChange={setDocumentType}
        description={description}
        onDescriptionChange={setDescription}
        onUpload={() => void handleUpload()}
        uploadError={uploadError}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">مدارک ثبت‌شده</h3>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void loadDocuments()}>
            بروزرسانی
          </Button>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="فیلتر نوع مدرک">
          {filterOptions.map((option) => {
            const selected = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <DocumentGallerySkeleton /> : null}

      {!loading && error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" onClick={() => void loadDocuments()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      {!loading && !error && filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <div className="text-3xl" aria-hidden>
            📁
          </div>
          <p className="font-medium text-foreground">مدرکی ثبت نشده است</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {canUpload
              ? 'اولین مدرک را با آپلود فایل اضافه کنید.'
              : 'هنوز مدرکی برای این مشتری ثبت نشده است.'}
          </p>
        </div>
      ) : null}

      {!loading && !error && filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {filteredDocuments.map((document) => (
            <article
              key={document.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <button
                type="button"
                className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/30 p-3 text-center transition hover:bg-muted/50"
                disabled={openingId === document.id}
                onClick={() => void handleOpenDocument(document)}
                aria-label={`باز کردن ${document.originalFileName}`}
              >
                <DocumentThumbnail customerId={customerId} document={document} />
              </button>

              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground" title={document.originalFileName}>
                      {document.originalFileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {CUSTOMER_DOCUMENT_TYPE_LABELS[document.documentType]}
                    </p>
                  </div>
                  {canDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(document)}
                    >
                      حذف
                    </Button>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground">{formatFileSize(document.sizeBytes)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatIsoDateAsJalali(document.createdAt.slice(0, 10))}
                </p>
                {document.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{document.description}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <BulkConfirmDialog
        open={deleteTarget !== null}
        title="حذف مدرک؟"
        description={
          deleteTarget
            ? `فایل «${deleteTarget.originalFileName}» به‌صورت نرم حذف می‌شود.`
            : undefined
        }
        selectedCount={1}
        confirmLabel="حذف"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />

      <DocumentPreviewLightbox
        open={preview !== null}
        title={preview?.title ?? ''}
        imageUrl={preview?.url ?? ''}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

function DocumentGallerySkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
      aria-busy="true"
      aria-label="در حال بارگذاری مدارک"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-border">
          <div className="aspect-[4/3] animate-pulse bg-muted/40" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/50" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
