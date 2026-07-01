export type TotpVerifyResult =
  | { ok: true; via: 'totp' | 'backup' }
  | { ok: false; reason: 'invalid' | 'backup_used' };

export interface ITotpVerificationPort {
  verifyForLogin(userId: string, code: string): Promise<TotpVerifyResult>;
}
