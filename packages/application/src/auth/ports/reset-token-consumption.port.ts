export interface IResetTokenConsumptionPort {
  isConsumed(jti: string): Promise<boolean>;
  markConsumed(jti: string, ttlSeconds: number): Promise<void>;
}
