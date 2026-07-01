import type { BranchListItemDto } from '@hivork/contracts';

export type LoginStep = 'phone' | 'otp' | 'tenant' | 'branch';

export type TenantOption = {
  slug: string;
  name: string;
};

export type LoginFlowState = {
  step: LoginStep;
  phone: string;
  otpCode: string;
  rememberMe: boolean;
  tenants: TenantOption[];
  selectedTenantSlug: string | null;
  selectedBranchId: string | null;
  branches: BranchListItemDto[];
  rateLimitUntil: number | null;
  resendUntil: number | null;
  error: string | null;
  loading: boolean;
  otpShake: boolean;
};

export type LoginFlowAction =
  | { type: 'SET_PHONE'; phone: string }
  | { type: 'SET_REMEMBER_ME'; rememberMe: boolean }
  | { type: 'SET_OTP'; code: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'OTP_SENT' }
  | { type: 'RATE_LIMITED'; until: number }
  | { type: 'RESEND_SCHEDULED'; until: number }
  | { type: 'NEED_TENANT'; tenants: TenantOption[] }
  | { type: 'SELECT_TENANT'; slug: string }
  | { type: 'GO_BRANCH'; branches: BranchListItemDto[]; branchId?: string }
  | { type: 'SELECT_BRANCH'; branchId: string }
  | { type: 'OTP_INVALID' }
  | { type: 'BACK' };

export const initialLoginFlowState: LoginFlowState = {
  step: 'phone',
  phone: '',
  otpCode: '',
  rememberMe: false,
  tenants: [],
  selectedTenantSlug: null,
  selectedBranchId: null,
  branches: [],
  rateLimitUntil: null,
  resendUntil: null,
  error: null,
  loading: false,
  otpShake: false,
};

export function loginFlowReducer(state: LoginFlowState, action: LoginFlowAction): LoginFlowState {
  switch (action.type) {
    case 'SET_PHONE':
      return { ...state, phone: action.phone, error: null };
    case 'SET_REMEMBER_ME':
      return { ...state, rememberMe: action.rememberMe, error: null };
    case 'SET_OTP':
      return { ...state, otpCode: action.code, error: null, otpShake: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'OTP_SENT':
      return {
        ...state,
        step: 'otp',
        loading: false,
        error: null,
        resendUntil: Date.now() + 60_000,
      };
    case 'RATE_LIMITED':
      return {
        ...state,
        rateLimitUntil: action.until,
        loading: false,
        error: 'تعداد درخواست‌های کد بیش از حد مجاز است.',
      };
    case 'RESEND_SCHEDULED':
      return { ...state, resendUntil: action.until, loading: false, error: null };
    case 'NEED_TENANT':
      return {
        ...state,
        step: 'tenant',
        tenants: action.tenants,
        loading: false,
        error: null,
      };
    case 'SELECT_TENANT':
      return { ...state, selectedTenantSlug: action.slug, error: null };
    case 'GO_BRANCH':
      return {
        ...state,
        step: 'branch',
        branches: action.branches,
        loading: false,
        error: null,
        selectedBranchId: action.branchId ?? state.selectedBranchId,
      };
    case 'SELECT_BRANCH':
      return { ...state, selectedBranchId: action.branchId, error: null };
    case 'OTP_INVALID':
      return {
        ...state,
        loading: false,
        otpShake: true,
        error: 'کد تأیید نامعتبر یا منقضی شده است.',
      };
    case 'BACK':
      if (state.step === 'otp') {
        return { ...state, step: 'phone', otpCode: '', error: null };
      }
      if (state.step === 'tenant') {
        return { ...state, step: 'otp', error: null };
      }
      if (state.step === 'branch') {
        return { ...state, step: 'tenant', error: null };
      }
      return state;
    default:
      return state;
  }
}
