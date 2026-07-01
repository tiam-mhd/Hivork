import type { BranchListItemDto, CreateBranchDto, UpdateBranchDto } from '@hivork/contracts/core';
import { CreateBranchSchema } from '@hivork/contracts/core';

export type BranchFormValues = {
  name: string;
  address: string;
  phone: string;
};

export type BranchFormFieldErrors = Partial<Record<keyof BranchFormValues, string>>;

export const EMPTY_BRANCH_FORM_VALUES: BranchFormValues = {
  name: '',
  address: '',
  phone: '',
};

export function branchToFormValues(branch: BranchListItemDto): BranchFormValues {
  return {
    name: branch.name,
    address: branch.address ?? '',
    phone: branch.phone ?? '',
  };
}

export function validateBranchForm(values: BranchFormValues): BranchFormFieldErrors {
  const errors: BranchFormFieldErrors = {};
  const trimmedName = values.name.trim();

  if (trimmedName.length < 2) {
    errors.name = 'نام شعبه باید حداقل ۲ کاراکتر باشد.';
  } else if (trimmedName.length > 100) {
    errors.name = 'نام شعبه نباید بیش از ۱۰۰ کاراکتر باشد.';
  }

  const trimmedAddress = values.address.trim();
  if (trimmedAddress.length > 500) {
    errors.address = 'آدرس نباید بیش از ۵۰۰ کاراکتر باشد.';
  }

  if (values.phone.trim()) {
    const phonePayload: CreateBranchDto = {
      name: trimmedName.length >= 2 ? trimmedName : 'xx',
      phone: values.phone.trim(),
    };
    const parsed = CreateBranchSchema.safeParse(phonePayload);
    if (!parsed.success) {
      const phoneIssue = parsed.error.issues.find((issue) => issue.path[0] === 'phone');
      if (phoneIssue) {
        errors.phone = 'شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.';
      }
    }
  }

  return errors;
}

export function formValuesToCreateDto(values: BranchFormValues): CreateBranchDto {
  const trimmedName = values.name.trim();
  const trimmedAddress = values.address.trim();
  const trimmedPhone = values.phone.trim();

  return CreateBranchSchema.parse({
    name: trimmedName,
    ...(trimmedAddress ? { address: trimmedAddress } : {}),
    ...(trimmedPhone ? { phone: trimmedPhone } : {}),
  });
}

export function formValuesToUpdateDto(values: BranchFormValues): UpdateBranchDto {
  const trimmedName = values.name.trim();
  const trimmedAddress = values.address.trim();
  const trimmedPhone = values.phone.trim();

  return {
    name: trimmedName,
    address: trimmedAddress.length > 0 ? trimmedAddress : null,
    phone: trimmedPhone.length > 0 ? trimmedPhone : null,
  };
}

export function canDeleteBranch(branch: Pick<BranchListItemDto, 'isDefault'>): boolean {
  return !branch.isDefault;
}
