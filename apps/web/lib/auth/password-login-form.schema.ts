import { PasswordLoginSchema, phoneSchema } from '@hivork/contracts';

import { LOGIN_PASSWORD_I18N } from './login-password-i18n';

export type PasswordLoginFormValues = {
  phone: string;
  password: string;
  tenantSlug?: string;
  rememberMe: boolean;
};

export function validatePasswordLoginForm(values: {
  phone: string;
  password: string;
  tenantSlug?: string;
  rememberMe?: boolean;
}):
  | { success: true; data: PasswordLoginFormValues }
  | { success: false; fieldErrors: Partial<Record<'phone' | 'password' | 'tenantSlug', string>> } {
  const fieldErrors: Partial<Record<'phone' | 'password' | 'tenantSlug', string>> = {};

  const phoneResult = phoneSchema.safeParse(values.phone);
  if (!phoneResult.success) {
    fieldErrors.phone = phoneResult.error.issues[0]?.message ?? 'شماره موبایل نامعتبر است';
  }

  if (!values.password.trim()) {
    fieldErrors.password = LOGIN_PASSWORD_I18N.passwordRequired;
  } else if (values.password.length > 128) {
    fieldErrors.password = 'رمز عبور بیش از حد طولانی است';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  const parsed = PasswordLoginSchema.safeParse({
    phone: values.phone,
    password: values.password,
    tenantSlug: values.tenantSlug,
    rememberMe: values.rememberMe ?? false,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === 'tenantSlug') {
        fieldErrors.tenantSlug = issue.message;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, fieldErrors };
    }
  }

  return {
    success: true,
    data: {
      phone: phoneResult.success ? phoneResult.data : values.phone,
      password: values.password,
      tenantSlug: values.tenantSlug,
      rememberMe: values.rememberMe ?? false,
    },
  };
}
