export type TotpSetupPending = {
  secretEncrypted: string;
  expiresAt: Date;
};

export interface ITotpSetupStorePort {
  save(userId: string, pending: TotpSetupPending): Promise<void>;
  get(userId: string): Promise<TotpSetupPending | null>;
  delete(userId: string): Promise<void>;
}

export const TOTP_SETUP_TTL_SECONDS = 600;
