'use client';

import type { RoleResponseDto } from '@hivork/contracts/core';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useState } from 'react';

import { DataScopeSelector } from '@/components/roles/data-scope-selector';
import { PermissionMatrix } from '@/components/roles/permission-matrix';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import {
  autoRoleCodeFromName,
  EMPTY_ROLE_FORM_VALUES,
  isRoleFormDirty,
  roleToFormValues,
  type RoleFormFieldErrors,
  type RoleFormValues,
} from '@/lib/roles/role-form.schema';

type RoleFormProps = {
  mode: 'create' | 'edit';
  initialRole?: RoleResponseDto | null;
  loading?: boolean;
  fieldErrors?: RoleFormFieldErrors;
  onSubmit: (values: RoleFormValues) => void;
  onCancel: () => void;
  onClearFieldErrors?: () => void;
  installmentsModuleEnabled?: boolean;
};

export function RoleForm({
  mode,
  initialRole = null,
  loading = false,
  fieldErrors = {},
  onSubmit,
  onCancel,
  onClearFieldErrors,
  installmentsModuleEnabled = true,
}: RoleFormProps) {
  const nameId = useId();
  const codeId = useId();
  const [values, setValues] = useState<RoleFormValues>(EMPTY_ROLE_FORM_VALUES);
  const [initialValues, setInitialValues] = useState<RoleFormValues>(EMPTY_ROLE_FORM_VALUES);
  const [codeTouched, setCodeTouched] = useState(false);

  const { confirmLeave } = useUnsavedWarning(isRoleFormDirty(values, initialValues));

  useEffect(() => {
    if (mode === 'edit' && initialRole) {
      const next = roleToFormValues(initialRole);
      setValues(next);
      setInitialValues(next);
      setCodeTouched(true);
      return;
    }

    setValues(EMPTY_ROLE_FORM_VALUES);
    setInitialValues(EMPTY_ROLE_FORM_VALUES);
    setCodeTouched(false);
  }, [initialRole, mode]);

  function setField<K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    onClearFieldErrors?.();
  }

  function handleNameChange(name: string) {
    setField('name', name);
    if (mode === 'create' && !codeTouched) {
      setField('code', autoRoleCodeFromName(name));
    }
  }

  function handleCancel() {
    if (!confirmLeave()) {
      return;
    }
    onCancel();
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={nameId}>
            نام نقش <span className="text-red-600">*</span>
          </Label>
          <Input
            id={nameId}
            value={values.name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="مثلاً: حسابدار"
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <p className="text-sm text-red-600">{fieldErrors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={codeId}>
            شناسه (slug) {mode === 'create' ? <span className="text-red-600">*</span> : null}
          </Label>
          <Input
            id={codeId}
            value={values.code}
            onChange={(event) => {
              setCodeTouched(true);
              setField('code', event.target.value.toLowerCase());
            }}
            placeholder="accountant"
            disabled={loading || mode === 'edit'}
            dir="ltr"
            className="text-start"
            aria-invalid={Boolean(fieldErrors.code)}
          />
          <p className="text-xs text-neutral-500">
            {mode === 'create'
              ? 'به‌صورت خودکار از نام ساخته می‌شود؛ فقط حروف کوچک انگلیسی.'
              : 'شناسه پس از ایجاد قابل تغییر نیست.'}
          </p>
          {fieldErrors.code ? <p className="text-sm text-red-600">{fieldErrors.code}</p> : null}
        </div>
      </div>

      <DataScopeSelector
        value={values.dataScope}
        onChange={(dataScope) => setField('dataScope', dataScope)}
        disabled={loading}
      />

      <PermissionMatrix
        value={values.permissions}
        onChange={(permissions) => setField('permissions', permissions)}
        disabled={loading}
        installmentsModuleEnabled={installmentsModuleEnabled}
        error={fieldErrors.permissions}
      />

      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
        <Button type="button" variant="outline" disabled={loading} onClick={handleCancel}>
          انصراف
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'در حال ذخیره...' : mode === 'create' ? 'ثبت نقش' : 'ذخیره تغییرات'}
        </Button>
      </div>
    </form>
  );
}
