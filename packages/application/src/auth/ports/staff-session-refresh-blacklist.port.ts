export interface IStaffSessionRefreshBlacklistPort {
  revokeByHash(refreshTokenHash: string, ttlSeconds: number): Promise<void>;
  isRevokedByHash(refreshTokenHash: string): Promise<boolean>;
}
