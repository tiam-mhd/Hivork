'use client';

import type { BranchListItemDto, RoleResponseDto, StaffResponseDto } from '@hivork/contracts/core';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useRef, useState } from 'react';

import { PhoneInput } from '@/components/form/phone-input';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import {
  EMPTY_STAFF_FORM_VALUES,
  isStaffFormDirty,
  staffToFormValues,
  type StaffFormFieldErrors,
  type StaffFormValues,
} from '@/lib/staff/staff-form.schema';

type StaffFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  staff?: StaffResponseDto | null;
  roles: RoleResponseDto[];
  branches: BranchListItemDto[];
  loading?: boolean;
  fieldErrors?: StaffFormFieldErrors;
  onClose: () => void;
  onSubmit: (values: StaffFormValues) => void | Promise<void>;
  onClearFieldErrors?: () => void;
};

function selectableRoles(roles: RoleResponseDto[], mode: 'create' | 'edit'): RoleResponseDto[] {
  if (mode === 'create') {
    return roles.filter((role) => role.code !== 'owner');
  }
  return roles;
}

export function StaffFormModal({
  open,
  mode,
  staff = null,
  roles,
  branches,
  loading = false,
  fieldErrors = {},
  onClose,
  onSubmit,
  onClearFieldErrors,
}: StaffFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameId = useId();
  const roleId = useId();
  const statusId = useId();
  const branchesFieldId = useId();

  const [values, setValues] = useState<StaffFormValues>(EMPTY_STAFF_FORM_VALUES);
  const [initialValues, setInitialValues] = useState<StaffFormValues>(EMPTY_STAFF_FORM_VALUES);

  const lockRole = mode === 'edit' && staff ? staff.roles.some((role) => role.code === 'owner') : false;
  const availableRoles = selectableRoles(roles, mode);

  const { confirmLeave } = useUnsavedWarning(isStaffFormDirty(values, initialValues));

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
      setValues(EMPTY_STAFF_FORM_VALUES);
      setInitialValues(EMPTY_STAFF_FORM_VALUES);
      return;
    }

    if (mode === 'edit' && staff) {
      const next = staffToFormValues(staff);
      setValues(next);
      setInitialValues(next);
      return;
    }

    setValues(EMPTY_STAFF_FORM_VALUES);
    setInitialValues(EMPTY_STAFF_FORM_VALUES);
  }, [mode, open, staff]);

  function handleClose() {
    if (loading) {
      return;
    }
    if (!confirmLeave()) {
      return;
    }
    onClose();
  }

  function setField<K extends keyof StaffFormValues>(key: K, value: StaffFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    onClearFieldErrors?.();
  }

  function toggleBranch(branchId: string) {
    setValues((prev) => {
      const selected = prev.assignedBranchIds.includes(branchId)
        ? prev.assignedBranchIds.filter((id) => id !== branchId)
        : [...prev.assignedBranchIds, branchId];
      return { ...prev, assignedBranchIds: selected };
    });
    onClearFieldErrors?.();
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[min(100%,32rem)] max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      aria-labelledby="staff-form-title"
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(values);
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="staff-form-title" className="text-lg font-semibold text-neutral-900">
            {mode === 'create' ? 'کارمند جدید' : 'ویرایش کارمند'}
          </h2>
          <p className="text-sm text-neutral-600">
            {mode === 'create'
              ? 'کارمند با همین شماره از طریق OTP وارد می‌شود.'
              : 'تغییرات نقش و شعب بلافاصله اعمال می‌شود.'}
          </p>
        </div>

        {mode === 'create' ? (
          <PhoneInput
            value={values.phone}
            onChange={(phone) => setField('phone', phone)}
            label="شماره موبایل"
            helpText="کارمند با همین شماره از طریق OTP وارد می‌شود."
            required
            disabled={loading}
            error={fieldErrors.phone}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <Label>شماره موبایل</Label>
            <Input value={values.phone} disabled dir="ltr" className="min-h-11 text-start" />
            <p className="text-xs text-neutral-500">شماره موبایل پس از ثبت قابل تغییر نیست.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor={nameId}>
            نام <span className="text-red-600">*</span>
          </Label>
          <Input
            id={nameId}
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="مثال: رضا کریمی"
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <p className="text-sm text-red-600">{fieldErrors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={roleId}>
            نقش <span className="text-red-600">*</span>
          </Label>
          <select
            id={roleId}
            className="min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm disabled:bg-neutral-50"
            value={values.roleId}
            disabled={loading || lockRole}
            onChange={(event) => setField('roleId', event.target.value)}
            aria-invalid={Boolean(fieldErrors.roleId)}
          >
            <option value="">انتخاب نقش...</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {lockRole ? (
            <p className="text-xs text-neutral-500">نقش مالک قابل تغییر نیست.</p>
          ) : null}
          {fieldErrors.roleId ? <p className="text-sm text-red-600">{fieldErrors.roleId}</p> : null}
        </div>

        <fieldset className="flex flex-col gap-2" id={branchesFieldId}>
          <legend className="text-sm font-medium text-neutral-900">شعب</legend>
          <p className="text-xs text-neutral-500">خالی = دسترسی به همه شعب</p>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
            {branches.length === 0 ? (
              <p className="text-sm text-neutral-500">شعبه فعالی یافت نشد.</p>
            ) : (
              branches.map((branch) => (
                <label key={branch.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-neutral-300"
                    checked={values.assignedBranchIds.includes(branch.id)}
                    disabled={loading}
                    onChange={() => toggleBranch(branch.id)}
                  />
                  <span>{branch.name}</span>
                </label>
              ))
            )}
          </div>
          {fieldErrors.assignedBranchIds ? (
            <p className="text-sm text-red-600">{fieldErrors.assignedBranchIds}</p>
          ) : null}
        </fieldset>

        {mode === 'edit' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={statusId}>وضعیت</Label>
            <select
              id={statusId}
              className="min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm"
              value={values.status}
              disabled={loading}
              onChange={(event) =>
                setField('status', event.target.value as StaffFormValues['status'])
              }
            >
              <option value="active">فعال</option>
              <option value="suspended">غیرفعال</option>
            </select>
            {values.status === 'suspended' ? (
              <p className="text-xs text-amber-700">غیرفعال — ورود مسدود است.</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button type="button" variant="outline" disabled={loading} onClick={handleClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'در حال ذخیره...' : mode === 'create' ? 'ثبت کارمند' : 'ذخیره تغییرات'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
