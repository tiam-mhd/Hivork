/** Revoke active sessions after password reset — full StaffSession in IFP-009. */
export interface IUserSessionRevocationPort {
  revokeAllSessionsForUser(userId: string): Promise<void>;
}

export interface IUserRefreshInvalidationPort {
  getInvalidBefore(userId: string): Promise<number | null>;
  invalidateAllForUser(userId: string, ttlSeconds: number): Promise<void>;
}
