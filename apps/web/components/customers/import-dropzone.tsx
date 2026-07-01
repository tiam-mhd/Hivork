'use client';

import { Button } from '@hivork/ui';
import { useCallback, useId, useRef, useState } from 'react';

import {
  CUSTOMER_IMPORT_ACCEPT,
  validateCustomerImportFile,
} from '@/lib/customers/import-file-validation';

type ImportDropzoneProps = {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  validationError?: string | null;
};

export function ImportDropzone({
  disabled = false,
  onFileSelected,
  validationError = null,
}: ImportDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) {
        return;
      }

      const validation = validateCustomerImportFile(file);
      if (!validation.ok) {
        setLocalError(validation.message);
        return;
      }

      setLocalError(null);
      onFileSelected(file);
    },
    [disabled, onFileSelected],
  );

  const displayError = validationError ?? localError;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="ناحیه رها کردن فایل Excel"
        aria-disabled={disabled}
        className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragActive ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 bg-white'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-neutral-400'}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            setDragActive(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
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
          if (!disabled) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <p className="text-neutral-700">فایل Excel را اینجا رها کنید</p>
        <p className="text-sm text-neutral-500">یا</p>
        <Button type="button" variant="outline" disabled={disabled} onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}>
          انتخاب فایل
        </Button>
        <p className="text-xs text-neutral-500">فرمت: .xlsx — حداکثر ۵ مگابایت</p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={CUSTOMER_IMPORT_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {displayError ? (
        <p className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
