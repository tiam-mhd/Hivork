import type { AuthActor } from './auth.port.js';

export type OtpPurpose =
  | 'login'
  | 'mfa_step_up'
  | 'password_reset'
  | 'phone_change_current'
  | 'phone_change_new';

export type OtpRecord = {
  code: string;
  attempts: number;
};

export type OtpStoreKey = {
  actor: AuthActor;
  phone: string;
  purpose?: OtpPurpose;
};

export interface IOtpStore {
  save(params: OtpStoreKey & {
    record: OtpRecord;
    ttlSeconds: number;
  }): Promise<void>;
  get(params: OtpStoreKey): Promise<OtpRecord | null>;
  delete(params: OtpStoreKey): Promise<void>;
  update(params: OtpStoreKey & {
    record: OtpRecord;
  }): Promise<void>;
}

export interface IOtpRateLimiter {
  /** Returns true when the request is allowed. */
  checkOtpRateLimit(phone: string): Promise<boolean>;
}
