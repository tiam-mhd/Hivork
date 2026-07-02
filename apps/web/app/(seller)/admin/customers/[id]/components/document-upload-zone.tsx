'use client';

import type { CustomerDocumentTypeDto } from '@hivork/contracts/customers';
import { Button, Label, Select, Textarea } from '@hivork/ui';
import { useCallback, useId, useRef, useState } from 'react';

import { CUSTOMER_DOCUMENT_TYPE_OPTIONS } from '@/lib/customers/customer-document-labels';
import {
  CUSTOMER_DOCUMENT_ACCEPT,
  CUSTOMER_DOCUMENT_MAX_BYTES,
  validateCustomerDocumentFile,
} from '@/lib/customers/customer-document-validation';

type DocumentUploadZoneProps = {
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  progressPercent?: number | null;
  selectedFile?: File | null;
  onFileSelected: (file: File) => void;
  documentType: CustomerDocumentTypeDto;
  onDocumentTypeChange: (value: CustomerDocumentTypeDto) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onUpload: () => void;
  validationError?: string | null;
  uploadError?: string | null;
};

export function DocumentUploadZone({
  disabled = false,
  readOnly = false,
  loading = false,
  progressPercent = null,
  selectedFile = null,
  onFileSelected,
  documentType,
  onDocumentTypeChange,
  description,
  onDescriptionChange,
  onUpload,
  validationError = null,
  uploadError = null,
}: DocumentUploadZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled || readOnly) {
        return;
      }

      const validation = validateCustomerDocumentFile(file);
      if (!validation.ok) {
        setLocalError(validation.message);
        return;
      }

      setLocalError(null);
      onFileSelected(file);
    },
    [disabled, onFileSelected, readOnly],
  );

  const displayError = uploadError ?? validationError ?? localError;
  const isBusy = disabled || loading;

  if (readOnly) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        شما مجوز آپلود مدارک را ندارید. نمایش فقط خواندنی است.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${inputId}-type`}>نوع مدرک</Label>
          <Select
            id={`${inputId}-type`}
            value={documentType}
            disabled={isBusy}
            onChange={(event) => onDocumentTypeChange(event.target.value as CustomerDocumentTypeDto)}
          >
            {CUSTOMER_DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={`${inputId}-description`}>توضیحات (اختیاری)</Label>
          <Textarea
            id={`${inputId}-description`}
            value={description}
            disabled={isBusy}
            placeholder="مثلاً روی کارت ملی — پشت"
            rows={2}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
        </div>
      </div>

      <div
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-label="ناحیه آپلود مدرک مشتری"
        aria-disabled={isBusy}
        className={`flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'
        } ${isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/50'}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isBusy) {
            setDragActive(true);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        onClick={() => {
          if (!isBusy) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (isBusy) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <p className="text-sm text-foreground">فایل را اینجا رها کنید یا انتخاب کنید</p>
        <p className="text-xs text-muted-foreground">
          JPEG، PNG یا PDF — حداکثر {Math.round(CUSTOMER_DOCUMENT_MAX_BYTES / (1024 * 1024))} مگابایت
        </p>
        {selectedFile ? (
          <p className="text-xs font-medium text-primary">{selectedFile.name}</p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={CUSTOMER_DOCUMENT_ACCEPT}
        className="sr-only"
        disabled={isBusy}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {progressPercent !== null ? (
        <div className="flex flex-col gap-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">در حال آپلود… {progressPercent}٪</p>
        </div>
      ) : null}

      {displayError ? (
        <p className="text-sm text-destructive" role="alert">
          {displayError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={isBusy || !selectedFile}
          onClick={onUpload}
        >
          {loading ? 'در حال آپلود…' : 'آپلود مدرک'}
        </Button>
      </div>
    </div>
  );
}
