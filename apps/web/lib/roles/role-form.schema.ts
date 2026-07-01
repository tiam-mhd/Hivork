import type { CreateRoleDto, RoleResponseDto, UpdateRoleDto } from '@hivork/contracts/core';
import { CreateRoleSchema } from '@hivork/contracts/core';

import { slugifyRoleCode } from './roles.utils';

export type RoleFormValues = {
  name: string;
  code: string;
  dataScope: RoleResponseDto['dataScope'];
  permissions: string[];
};

export type RoleFormFieldErrors = Partial<Record<keyof RoleFormValues, string>>;

export const EMPTY_ROLE_FORM_VALUES: RoleFormValues = {
  name: '',
  code: '',
  dataScope: 'branch',
  permissions: [],
};

export function roleToFormValues(role: RoleResponseDto): RoleFormValues {
  return {
    name: role.name,
    code: role.code,
    dataScope: role.dataScope,
    permissions: [...role.permissions],
  };
}

export function validateRoleForm(
  values: RoleFormValues,
  mode: 'create' | 'edit',
): RoleFormFieldErrors {
  const errors: RoleFormFieldErrors = {};
  const trimmedName = values.name.trim();
  const trimmedCode = values.code.trim();

  if (trimmedName.length < 2) {
    errors.name = 'نام نقش باید حداقل ۲ کاراکتر باشد.';
  } else if (trimmedName.length > 100) {
    errors.name = 'نام نقش نباید بیش از ۱۰۰ کاراکتر باشد.';
  }

  if (mode === 'create') {
    if (trimmedCode.length < 2) {
      errors.code = 'شناسه نقش باید حداقل ۲ کاراکتر باشد.';
    } else {
      const parsed = CreateRoleSchema.pick({ code: true }).safeParse({ code: trimmedCode });
      if (!parsed.success) {
        errors.code = 'شناسه باید حروف کوچک انگلیسی، عدد یا _ باشد.';
      }
    }
  }

  if (values.permissions.length === 0) {
    errors.permissions = 'حداقل یک مجوز انتخاب کنید.';
  }

  return errors;
}

export function autoRoleCodeFromName(name: string): string {
  return slugifyRoleCode(name);
}

export function formValuesToCreateDto(values: RoleFormValues): CreateRoleDto {
  return CreateRoleSchema.parse({
    name: values.name.trim(),
    code: values.code.trim(),
    dataScope: values.dataScope,
    permissions: values.permissions,
  });
}

export function formValuesToUpdateDto(values: RoleFormValues): UpdateRoleDto {
  return {
    name: values.name.trim(),
    dataScope: values.dataScope,
    permissions: values.permissions,
  };
}

export function isRoleFormDirty(current: RoleFormValues, initial: RoleFormValues): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

export function togglePermission(
  permissions: string[],
  code: string,
  enabled: boolean,
): string[] {
  if (enabled) {
    return permissions.includes(code) ? permissions : [...permissions, code];
  }
  return permissions.filter((item) => item !== code);
}

export function toggleModulePermissions(
  permissions: string[],
  moduleCodes: string[],
  selectAll: boolean,
): string[] {
  if (selectAll) {
    return [...new Set([...permissions, ...moduleCodes])];
  }
  const moduleSet = new Set(moduleCodes);
  return permissions.filter((code) => !moduleSet.has(code));
}

export function moduleSelectionState(
  permissions: string[],
  moduleCodes: string[],
): 'none' | 'partial' | 'all' {
  const selected = moduleCodes.filter((code) => permissions.includes(code));
  if (selected.length === 0) {
    return 'none';
  }
  if (selected.length === moduleCodes.length) {
    return 'all';
  }
  return 'partial';
}
