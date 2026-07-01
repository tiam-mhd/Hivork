export type TotpGenerateResult = {
  secret: string;
  otpauthUrl: string;
};

export interface ITotpServicePort {
  generateSecret(): string;
  buildOtpauthUrl(accountLabel: string, secret: string): string;
  verifyCode(secret: string, code: string): boolean;
}

export const TOTP_ISSUER = 'Hivork';
