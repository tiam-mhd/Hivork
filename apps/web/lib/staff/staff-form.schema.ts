import { phoneSchema } from '@hivork/contracts';
import type {
  CreateStaffDto,
  RoleResponseDto,
  StaffResponseDto,
  UpdateStaffDto,
} from '@hivork/contracts/core';
import { CreateStaffSchema } from '@hivork/contracts/core';
import { normalizePhoneDigits } from '@hivork/i18n';

export type StaffFormValues = {
  phone: string;
  name: string;
  roleId: string;
  assignedBranchIds: string[];
  status: 'active' | 'suspended';
};

export type StaffFormFieldErrors = Partial<Record<keyof StaffFormValues | 'assignedBranchIds', string>>;

export const EMPTY_STAFF_FORM_VALUES: StaffFormValues = {
  phone: '',
  name: '',
  roleId: '',
  assignedBranchIds: [],
  status: 'active',
};

export function staffToFormValues(staff: StaffResponseDto): StaffFormValues {
  return {
    phone: staff.phone,
    name: staff.name,
    roleId: staff.roles[0]?.id ?? '',
    assignedBranchIds: [...staff.assignedBranchIds],
    status: staff.status,
  };
}

export function normalizeStaffPhoneInput(phone: string): string {
  const digits = normalizePhoneDigits(phone.trim());
  if (digits.startsWith('9') && digits.length === 10) {
    return `0${digits}`;
  }
  return digits;
}

export function validateStaffForm(
  values: StaffFormValues,
  options: {
    mode: 'create' | 'edit';
    roles: RoleResponseDto[];
    lockRole?: boolean;
  },
): StaffFormFieldErrors {
  const errors: StaffFormFieldErrors = {};
  const trimmedName = values.name.trim();

  if (options.mode === 'create') {
    const normalizedPhone = normalizeStaffPhoneInput(values.phone);
    const parsedPhone = phoneSchema.safeParse(normalizedPhone);
    if (!parsedPhone.success) {
      errors.phone = 'شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.';
    }
  }

  if (trimmedName.length < 2) {
    errors.name = 'نام باید حداقل ۲ کاراکتر باشد.';
  } else if (trimmedName.length > 100) {
    errors.name = 'نام نباید بیش از ۱۰۰ کاراکتر باشد.';
  }

  if (!options.lockRole && !values.roleId) {
    errors.roleId = 'انتخاب نقش الزامی است.';
  }

  const selectedRole = options.roles.find((role) => role.id === values.roleId);
  if (
    selectedRole?.dataScope === 'branch' &&
    values.assignedBranchIds.length === 0
  ) {
    errors.assignedBranchIds = 'برای این نقش حداقل یک شعبه انتخاب کنید.';
  }

  return errors;
}

function deriveDataScope(assignedBranchIds: string[]): 'all' | 'branch' {
  return assignedBranchIds.length === 0 ? 'all' : 'branch';
}

export function formValuesToCreateDto(values: StaffFormValues): CreateStaffDto {
  const trimmedName = values.name.trim();
  const phone = normalizeStaffPhoneInput(values.phone);
  const assignedBranchIds = [...values.assignedBranchIds];
  const dataScope = deriveDataScope(assignedBranchIds);

  return CreateStaffSchema.parse({
    phone,
    name: trimmedName,
    dataScope,
    ...(assignedBranchIds.length > 0
      ? {
          assignedBranchIds,
          primaryBranchId: assignedBranchIds[0],
        }
      : {}),
    ...(values.roleId ? { roleIds: [values.roleId] } : {}),
  });
}

export function formValuesToUpdateDto(values: StaffFormValues): UpdateStaffDto {
  const trimmedName = values.name.trim();
  const assignedBranchIds = [...values.assignedBranchIds];
  const dataScope = deriveDataScope(assignedBranchIds);

  return {
    name: trimmedName,
    status: values.status,
    dataScope,
    assignedBranchIds,
    primaryBranchId: assignedBranchIds[0] ?? null,
  };
}

export function isStaffFormDirty(
  current: StaffFormValues,
  initial: StaffFormValues,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}
