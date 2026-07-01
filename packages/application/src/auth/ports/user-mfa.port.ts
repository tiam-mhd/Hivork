export type UserMfaSettings = {
  otpEnabled: boolean;
  totpEnabled: boolean;
  requireMfaOnLogin: boolean;
};

export type UserMfaLoginStepUp = {
  required: boolean;
  methods: Array<'otp' | 'totp'>;
  otpEnabled: boolean;
  totpEnabled: boolean;
};

export type TotpVerifyResult =
  | { ok: true; via: 'totp' | 'backup' }
  | { ok: false; reason: 'invalid' | 'backup_used' };

/** MFA settings + TOTP verify — IFP-005. */
export interface IUserMfaPort {
  getLoginStepUp(userId: string): Promise<UserMfaLoginStepUp>;
  isOtpStepUpEnabled(userId: string): Promise<boolean>;
  verifyTotp(userId: string, code: string): Promise<TotpVerifyResult>;
}
