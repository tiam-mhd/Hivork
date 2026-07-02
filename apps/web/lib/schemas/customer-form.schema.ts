import { CreateTenantCustomerSchema } from '@hivork/contracts/customers';
import type {
  CreateTenantCustomerDto,
  CustomerAddressDto,
  CustomerAddressInputDto,
  TenantCustomerDetailResponseDto,
  UpdateTenantCustomerDto,
} from '@hivork/contracts/customers';

import type { CustomerAddressLabel } from '@/lib/customers/customer-address-labels';
import { FA_FORM } from '@/lib/i18n';

export type { CustomerAddressLabel };

export type CustomerFormMode = 'create' | 'edit';

export type CustomerAddressFormValue = {
  clientKey: string;
  id?: string;
  label: CustomerAddressLabel;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  isPrimary: boolean;
  latitude: number | null;
  longitude: number | null;
};

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
  addresses: CustomerAddressFormValue[];
  localCode: string;
  tags: string[];
  defaultBranchId: string;
  notes: string;
  internalNotes: string;
};

export type CustomerFormFieldErrors = Partial<Record<keyof CustomerFormValues | 'form', string>> & {
  addressErrors?: Record<number, string>;
};

export function createEmptyAddressFormValue(isPrimary = false): CustomerAddressFormValue {
  const clientKey =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `addr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    clientKey,
    label: 'home',
    line1: '',
    line2: '',
    city: '',
    province: '',
    postalCode: '',
    isPrimary,
    latitude: null,
    longitude: null,
  };
}

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
  addresses: [],
  localCode: '',
  tags: [],
  defaultBranchId: '',
  notes: '',
  internalNotes: '',
};

export function isPhoneReadOnly(mode: CustomerFormMode): boolean {
  return mode === 'edit';
}

function addressDtoToFormValue(dto: CustomerAddressDto): CustomerAddressFormValue {
  return {
    clientKey: dto.id,
    id: dto.id,
    label: dto.label ?? 'home',
    line1: dto.line1,
    line2: dto.line2 ?? '',
    city: dto.city ?? '',
    province: dto.province ?? '',
    postalCode: dto.postalCode ?? '',
    isPrimary: dto.isPrimary ?? false,
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
  };
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
    addresses: (detail.addresses ?? []).map(addressDtoToFormValue),
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

function addressFormValueToDto(value: CustomerAddressFormValue): CustomerAddressInputDto & { id?: string } {
  const dto: CustomerAddressInputDto & { id?: string } = {
    label: value.label,
    line1: value.line1.trim(),
    line2: emptyToUndefined(value.line2),
    city: emptyToUndefined(value.city),
    province: emptyToUndefined(value.province),
    postalCode: emptyToUndefined(value.postalCode),
    isPrimary: value.isPrimary,
  };

  if (value.id) {
    dto.id = value.id;
  }

  if (value.latitude !== null && value.longitude !== null) {
    dto.latitude = value.latitude;
    dto.longitude = value.longitude;
  } else if (value.id) {
    dto.latitude = null;
    dto.longitude = null;
  }

  return dto;
}

function serializeAddresses(addresses: CustomerAddressFormValue[]): CustomerAddressInputDto[] {
  return addresses.filter((item) => item.line1.trim().length > 0).map(addressFormValueToDto);
}

function normalizeAddressesForCompare(addresses: CustomerAddressFormValue[]) {
  return addresses
    .filter((item) => item.line1.trim().length > 0 || item.id)
    .map((item) => ({
      id: item.id,
      label: item.label,
      line1: item.line1.trim(),
      line2: item.line2.trim(),
      city: item.city.trim(),
      province: item.province.trim(),
      postalCode: item.postalCode.trim(),
      isPrimary: item.isPrimary,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
}

export function formValuesToCreateDto(values: CustomerFormValues): CreateTenantCustomerDto {
  const addresses = serializeAddresses(values.addresses);

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
    addresses: addresses.length > 0 ? addresses : undefined,
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

  if (
    JSON.stringify(normalizeAddressesForCompare(current.addresses)) !==
    JSON.stringify(normalizeAddressesForCompare(original.addresses))
  ) {
    patch.addresses = serializeAddresses(current.addresses);
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

function applySchemaIssues(
  issues: Array<{ path: (string | number)[]; message: string }>,
  errors: CustomerFormFieldErrors,
) {
  for (const issue of issues) {
    const field = issue.path[0];
    if (field === 'addresses' && typeof issue.path[1] === 'number') {
      const index = issue.path[1];
      errors.addressErrors ??= {};
      if (!errors.addressErrors[index]) {
        errors.addressErrors[index] = issue.message;
      }
      continue;
    }

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

function validateOptionalContractFields(values: CustomerFormValues, errors: CustomerFormFieldErrors) {
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
    addresses: serializeAddresses(values.addresses),
  });

  if (!parsed.success) {
    applySchemaIssues(parsed.error.issues, errors);
  }
}

export function validateCustomerForm(
  mode: CustomerFormMode,
  values: CustomerFormValues,
): CustomerFormFieldErrors {
  const errors: CustomerFormFieldErrors = {};

  validateName(values.name, errors);

  for (const [index, address] of values.addresses.entries()) {
    if (!address.line1.trim()) {
      errors.addressErrors ??= {};
      if (!errors.addressErrors[index]) {
        errors.addressErrors[index] = 'آدرس (خط اول) الزامی است.';
      }
    }
  }

  if (mode === 'create') {
    if (!values.phone.trim()) {
      errors.phone = FA_FORM.FIELD_REQUIRED;
    }

    const payload = formValuesToCreateDto(values);
    const parsed = CreateTenantCustomerSchema.safeParse(payload);
    if (!parsed.success) {
      applySchemaIssues(parsed.error.issues, errors);
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && field === 'phone' && !errors.phone) {
          errors.phone = FA_FORM.INVALID_PHONE;
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
  if (code === 'COORDINATE_OUT_OF_IRAN' || code === 'COORDINATES_UNPAIRED') {
    return { form: message };
  }

  return {};
}

export function formsAreEqual(a: CustomerFormValues, b: CustomerFormValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function hasFormErrors(errors: CustomerFormFieldErrors): boolean {
  if (errors.form) {
    return true;
  }
  if (errors.addressErrors && Object.keys(errors.addressErrors).length > 0) {
    return true;
  }
  return Object.keys(errors).some((key) => key !== 'addressErrors');
}
