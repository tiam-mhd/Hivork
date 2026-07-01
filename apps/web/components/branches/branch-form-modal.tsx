'use client';

import type { BranchListItemDto } from '@hivork/contracts/core';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useRef, useState } from 'react';

import {
  branchToFormValues,
  EMPTY_BRANCH_FORM_VALUES,
  type BranchFormFieldErrors,
  type BranchFormValues,
} from '@/lib/branches/branch-form.schema';

type BranchFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  branch?: BranchListItemDto | null;
  loading?: boolean;
  fieldErrors?: BranchFormFieldErrors;
  onClose: () => void;
  onSubmit: (values: BranchFormValues) => void | Promise<void>;
  onClearFieldErrors?: () => void;
};

export function BranchFormModal({
  open,
  mode,
  branch = null,
  loading = false,
  fieldErrors = {},
  onClose,
  onSubmit,
  onClearFieldErrors,
}: BranchFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameId = useId();
  const addressId = useId();
  const phoneId = useId();
  const [values, setValues] = useState<BranchFormValues>(EMPTY_BRANCH_FORM_VALUES);

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

  useEffect(() => {
    if (!open) {
      setValues(EMPTY_BRANCH_FORM_VALUES);
      return;
    }

    if (mode === 'edit' && branch) {
      setValues(branchToFormValues(branch));
      return;
    }

    setValues(EMPTY_BRANCH_FORM_VALUES);
  }, [branch, mode, open]);

  function handleClose() {
    if (loading) {
      return;
    }
    onClose();
  }

  function setField<K extends keyof BranchFormValues>(key: K, value: BranchFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    onClearFieldErrors?.();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  const title = mode === 'create' ? 'شعبه جدید' : 'ویرایش شعبه';

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-lg rounded-lg border border-neutral-200 p-0 backdrop:bg-black/30"
      onClose={handleClose}
      onCancel={(event) => {
        if (loading) {
          event.preventDefault();
        }
      }}
    >
      <form className="flex flex-col gap-4 p-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-600">
            {mode === 'create'
              ? 'اطلاعات شعبه جدید را وارد کنید.'
              : 'اطلاعات شعبه را ویرایش کنید.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={nameId}>
            نام شعبه <span className="text-red-600">*</span>
          </Label>
          <Input
            id={nameId}
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="مثال: شعبه مرکزی"
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
            autoFocus
          />
          {fieldErrors.name ? (
            <p id={`${nameId}-error`} className="text-sm text-red-600" role="alert">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={addressId}>آدرس</Label>
          <Input
            id={addressId}
            value={values.address}
            onChange={(event) => setField('address', event.target.value)}
            placeholder="آدرس کامل شعبه"
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.address)}
          />
          {fieldErrors.address ? (
            <p className="text-sm text-red-600" role="alert">
              {fieldErrors.address}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={phoneId}>تلفن</Label>
          <Input
            id={phoneId}
            type="tel"
            dir="ltr"
            inputMode="tel"
            className="text-start"
            value={values.phone}
            onChange={(event) => setField('phone', event.target.value)}
            placeholder="09121234567"
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={`${phoneId}-help`}
          />
          <p id={`${phoneId}-help`} className="text-xs text-neutral-500">
            شماره موبایل تماس شعبه (اختیاری) — فرمت 09xxxxxxxxx
          </p>
          {fieldErrors.phone ? (
            <p className="text-sm text-red-600" role="alert">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            انصراف
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'در حال ذخیره...' : mode === 'create' ? 'ثبت شعبه' : 'ذخیره تغییرات'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
