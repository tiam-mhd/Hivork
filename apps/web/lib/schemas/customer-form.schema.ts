import { CreateTenantCustomerSchema } from '@hivork/contracts/customers';
import type {
  CreateTenantCustomerDto,
  TenantCustomerDetailResponseDto,
  UpdateTenantCustomerDto,
} from '@hivork/contracts/customers';

import { FA_FORM } from '@/lib/i18n';

export type CustomerFormMode = 'create' | 'edit';

export type CustomerFormValues = {
  phone: string;
  name: string;
  email: string;
  preferredContactChannel: '' | 'telegram' | 'bale' | 'sms' | 'phone';
  marketingOptIn: boolean;
  nationalId: string;
  birthDate: string;
  gender: '' | 'male' | 'female' | 'other' | 'unspecified';
  address: string;
  localCode: string;
  tags: string[];
  defaultBranchId: string;
  notes: string;
  internalNotes: string;
};

export type CustomerFormFieldErrors = Partial<Record<keyof CustomerFormValues | 'form', string>>;

export const EMPTY_CUSTOMER_FORM_VALUES: CustomerFormValues = {
  phone: '',
  name: '',
  email: '',
  preferredContactChannel: '',
  marketingOptIn: false,
  nationalId: '',
  birthDate: '',
  gender: '',
  address: '',
  localCode: '',
  tags: [],
  defaultBranchId: '',
  notes: '',
  internalNotes: '',
};

export function isPhoneReadOnly(mode: CustomerFormMode): boolean {
  return mode === 'edit';
}

export function detailToFormValues(detail: TenantCustomerDetailResponseDto): CustomerFormValues {
  return {
    phone: detail.globalCustomer.phone,
    name: detail.globalCustomer.name ?? '',
    email: detail.globalCustomer.email ?? '',
    preferredContactChannel: detail.preferredContactChannel ?? '',
    marketingOptIn: detail.marketingOptIn ?? false,
    nationalId: detail.globalCustomer.nationalId ?? '',
    birthDate: detail.globalCustomer.birthDate ?? '',
    gender: detail.globalCustomer.gender ?? '',
    address: detail.globalCustomer.address ?? '',
    localCode: detail.localCode ?? '',
    tags: detail.tags,
    defaultBranchId: detail.defaultBranchId ?? '',
    notes: detail.notes ?? '',
    internalNotes: detail.internalNotes ?? '',
  };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function formValuesToCreateDto(values: CustomerFormValues): CreateTenantCustomerDto {
  return {
    phone: values.phone,
    name: values.name.trim(),
    email: emptyToUndefined(values.email),
    nationalId: emptyToUndefined(values.nationalId),
    birthDate: emptyToUndefined(values.birthDate),
    gender: values.gender || undefined,
    address: emptyToUndefined(values.address),
    localCode: emptyToUndefined(values.localCode),
    tags: values.tags.length > 0 ? values.tags : undefined,
    notes: emptyToUndefined(values.notes),
    internalNotes: emptyToUndefined(values.internalNotes),
    defaultBranchId: emptyToUndefined(values.defaultBranchId),
    preferredContactChannel: values.preferredContactChannel || undefined,
    marketingOptIn: values.marketingOptIn,
  };
}

function nullableString(current: string, original: string): string | null | undefined {
  const currentTrimmed = current.trim();
  const originalTrimmed = original.trim();
  if (currentTrimmed === originalTrimmed) {
    return undefined;
  }
  return currentTrimmed.length > 0 ? currentTrimmed : null;
}

export function buildUpdatePatch(
  original: CustomerFormValues,
  current: CustomerFormValues,
  version: number,
): UpdateTenantCustomerDto | null {
  const patch: UpdateTenantCustomerDto = { version };

  if (current.name.trim() !== original.name.trim()) {
    patch.name = current.name.trim();
  }

  const email = nullableString(current.email, original.email);
  if (email !== undefined) {
    patch.email = email;
  }

  const nationalId = nullableString(current.nationalId, original.nationalId);
  if (nationalId !== undefined) {
    patch.nationalId = nationalId;
  }

  if (current.birthDate !== original.birthDate) {
    patch.birthDate = current.birthDate.trim() ? current.birthDate : null;
  }

  if (current.gender !== original.gender) {
    patch.gender = current.gender || null;
  }

  const address = nullableString(current.address, original.address);
  if (address !== undefined) {
    patch.address = address;
  }

  const localCode = nullableString(current.localCode, original.localCode);
  if (localCode !== undefined) {
    patch.localCode = localCode;
  }

  if (JSON.stringify(current.tags) !== JSON.stringify(original.tags)) {
    patch.tags = current.tags;
  }

  const notes = nullableString(current.notes, original.notes);
  if (notes !== undefined) {
    patch.notes = notes;
  }

  const internalNotes = nullableString(current.internalNotes, original.internalNotes);
  if (internalNotes !== undefined) {
    patch.internalNotes = internalNotes;
  }

  if (current.defaultBranchId !== original.defaultBranchId) {
    patch.defaultBranchId = current.defaultBranchId.trim() ? current.defaultBranchId : null;
  }

  if (current.preferredContactChannel !== original.preferredContactChannel) {
    patch.preferredContactChannel = current.preferredContactChannel || null;
  }

  if (current.marketingOptIn !== original.marketingOptIn) {
    patch.marketingOptIn = current.marketingOptIn;
  }

  const { version: _version, ...fields } = patch;
  if (Object.keys(fields).length === 0) {
    return null;
  }

  return patch;
}

function validateName(name: string, errors: CustomerFormFieldErrors) {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    errors.name = 'نام باید حداقل ۲ کاراکتر باشد.';
  }
}

function validateOptionalContractFields(
  values: CustomerFormValues,
  errors: CustomerFormFieldErrors,
) {
  const parsed = CreateTenantCustomerSchema.safeParse({
    phone: values.phone || '09120000000',
    email: emptyToUndefined(values.email),
    nationalId: emptyToUndefined(values.nationalId),
    birthDate: emptyToUndefined(values.birthDate),
    address: emptyToUndefined(values.address),
    localCode: emptyToUndefined(values.localCode),
    tags: values.tags,
    notes: emptyToUndefined(values.notes),
    internalNotes: emptyToUndefined(values.internalNotes),
    defaultBranchId: emptyToUndefined(values.defaultBranchId),
    preferredContactChannel: values.preferredContactChannel || undefined,
    gender: values.gender || undefined,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && field !== 'phone') {
        const key = field as keyof CustomerFormValues;
        if (!errors[key]) {
          if (field === 'email') {
            errors.email = 'ایمیل معتبر نیست.';
          } else if (field === 'nationalId') {
            errors.nationalId = 'کد ملی باید ۱۰ رقم باشد.';
          } else {
            errors[key] = issue.message;
          }
        }
      }
    }
  }
}

export function validateCustomerForm(
  mode: CustomerFormMode,
  values: CustomerFormValues,
): CustomerFormFieldErrors {
  const errors: CustomerFormFieldErrors = {};

  validateName(values.name, errors);

  if (mode === 'create') {
    if (!values.phone.trim()) {
      errors.phone = FA_FORM.FIELD_REQUIRED;
    }

    const payload = formValuesToCreateDto(values);
    const parsed = CreateTenantCustomerSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') {
          const key = field as keyof CustomerFormValues;
          if (!errors[key]) {
            if (field === 'phone') {
              errors.phone = FA_FORM.INVALID_PHONE;
            } else if (field === 'email') {
              errors.email = 'ایمیل معتبر نیست.';
            } else if (field === 'nationalId') {
              errors.nationalId = 'کد ملی باید ۱۰ رقم باشد.';
            } else {
              errors[key] = issue.message;
            }
          }
        }
      }
    }
    return errors;
  }

  validateOptionalContractFields(values, errors);
  return errors;
}

export function mapApiErrorToFieldErrors(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): CustomerFormFieldErrors {
  const field = typeof details?.field === 'string' ? details.field : undefined;
  if (field && field in EMPTY_CUSTOMER_FORM_VALUES) {
    return { [field as keyof CustomerFormValues]: message };
  }

  if (code === 'CUSTOMER_ALREADY_EXISTS' || code === 'CUSTOMER_EXISTS') {
    return { phone: 'مشتری با این شماره قبلاً ثبت شده است.' };
  }
  if (code === 'INVALID_PHONE') {
    return { phone: FA_FORM.INVALID_PHONE };
  }
  if (code === 'INVALID_NATIONAL_ID' || code === 'FIELD_INVALID_FORMAT') {
    return { nationalId: 'کد ملی باید ۱۰ رقم باشد.' };
  }
  if (code === 'INVALID_EMAIL') {
    return { email: 'ایمیل معتبر نیست.' };
  }
  if (code === 'INVALID_BRANCH' || code === 'BRANCH_NOT_FOUND') {
    return { defaultBranchId: 'شعبه انتخاب‌شده معتبر نیست.' };
  }

  return {};
}

export function formsAreEqual(a: CustomerFormValues, b: CustomerFormValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
