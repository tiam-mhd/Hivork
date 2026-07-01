export type AuthActor = 'staff' | 'customer';

export type VerifiedTokenPayload = {
  phone: string;
  actor: AuthActor;
  purpose: 'register';
  type: 'verified';
};

export type MfaPendingTokenPayload = {
  sub: string;
  actor: 'staff';
  tenantId: string;
  staffId: string;
  rememberMe?: boolean;
  type: 'mfa_pending';
};

export type ChangePasswordTokenPayload = {
  sub: string;
  actor: 'staff';
  tenantId?: string;
  staffId?: string;
  type: 'change_password';
};

export type ResetTokenPayload = {
  sub: string;
  actor: 'staff';
  purpose: 'password_reset';
  jti: string;
  type: 'reset';
};

export type StaffAccessTokenPayload = {
  sub: string;
  actor: 'staff';
  tenantId: string;
  type: 'access';
};

export type CustomerAccessTokenPayload = {
  sub: string;
  actor: 'customer';
  type: 'access';
};

export type AccessTokenPayload = StaffAccessTokenPayload | CustomerAccessTokenPayload;

export type RefreshTokenPayload = {
  sub: string;
  actor: AuthActor;
  type: 'refresh';
  jti: string;
  rememberMe?: boolean;
  iat?: number;
};

/** JWT signing/verification — implemented in infrastructure (TASK-037). */
export interface IAuthTokenService {
  signAccessToken(payload: Omit<StaffAccessTokenPayload, 'type'>): Promise<string>;
  signAccessToken(payload: Omit<CustomerAccessTokenPayload, 'type'>): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload | null>;
  signRefreshToken(
    payload: Omit<RefreshTokenPayload, 'type' | 'jti'>,
    options?: { rememberMe?: boolean },
  ): Promise<{ token: string; jti: string }>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null>;
  signVerifiedToken(payload: Omit<VerifiedTokenPayload, 'type'>): Promise<string>;
  verifyVerifiedToken(token: string): Promise<VerifiedTokenPayload | null>;
  signMfaPendingToken(payload: Omit<MfaPendingTokenPayload, 'type'>): Promise<string>;
  verifyMfaPendingToken(token: string): Promise<MfaPendingTokenPayload | null>;
  signChangePasswordToken(payload: Omit<ChangePasswordTokenPayload, 'type'>): Promise<string>;
  verifyChangePasswordToken(token: string): Promise<ChangePasswordTokenPayload | null>;
  signResetToken(payload: Omit<ResetTokenPayload, 'type' | 'jti'>): Promise<{ token: string; jti: string }>;
  verifyResetToken(token: string): Promise<ResetTokenPayload | null>;
  getAccessTtlSeconds(): number;
  getRefreshTtlSeconds(): number;
  getRefreshSessionTtlSeconds(): number;
  getVerifiedTtlSeconds(): number;
  getMfaPendingTtlSeconds(): number;
  getChangePasswordTtlSeconds(): number;
  getResetTtlSeconds(): number;
}

/** Optional refresh-token revocation (logout). */
export interface ITokenBlacklistPort {
  revoke(token: string, ttlSeconds: number): Promise<void>;
  isRevoked(token: string): Promise<boolean>;
}
