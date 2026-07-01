import { randomUUID } from 'node:crypto';

import {
  AccessTokenPayload,
  ChangePasswordTokenPayload,
  CustomerAccessTokenPayload,
  IAuthTokenService,
  MfaPendingTokenPayload,
  RefreshTokenPayload,
  ResetTokenPayload,
  StaffAccessTokenPayload,
  VerifiedTokenPayload,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import { JwtTokenConfig } from './jwt.config.js';

@Injectable()
export class JwtTokenService implements IAuthTokenService {
  constructor(private readonly config: JwtTokenConfig) {}

  signAccessToken(
    payload: Omit<StaffAccessTokenPayload, 'type'> | Omit<CustomerAccessTokenPayload, 'type'>,
  ): Promise<string> {
    return Promise.resolve(
      jwt.sign({ ...payload, type: 'access' }, this.config.accessSecret, {
        expiresIn: this.config.accessTtlSeconds,
      }),
    );
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    return Promise.resolve(this.verifyToken(token, this.config.accessSecret, 'access'));
  }

  signRefreshToken(
    payload: Omit<RefreshTokenPayload, 'type' | 'jti'>,
    options?: { rememberMe?: boolean },
  ): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const rememberMe = options?.rememberMe ?? false;
    const expiresIn = rememberMe
      ? this.config.refreshTtlSeconds
      : this.config.refreshSessionTtlSeconds;

    const token = jwt.sign(
      { ...payload, jti, rememberMe, type: 'refresh' },
      this.config.refreshSecret,
      { expiresIn },
    );
    return Promise.resolve({ token, jti });
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    return Promise.resolve(this.verifyToken(token, this.config.refreshSecret, 'refresh'));
  }

  signVerifiedToken(payload: Omit<VerifiedTokenPayload, 'type'>): Promise<string> {
    return Promise.resolve(
      jwt.sign({ ...payload, type: 'verified' }, this.config.accessSecret, {
        expiresIn: this.config.verifiedTtlSeconds,
      }),
    );
  }

  verifyVerifiedToken(token: string): Promise<VerifiedTokenPayload | null> {
    return Promise.resolve(this.verifyToken(token, this.config.accessSecret, 'verified'));
  }

  signMfaPendingToken(payload: Omit<MfaPendingTokenPayload, 'type'>): Promise<string> {
    return Promise.resolve(
      jwt.sign({ ...payload, type: 'mfa_pending' }, this.config.accessSecret, {
        expiresIn: this.getMfaPendingTtlSeconds(),
      }),
    );
  }

  verifyMfaPendingToken(token: string): Promise<MfaPendingTokenPayload | null> {
    return Promise.resolve(this.verifyToken(token, this.config.accessSecret, 'mfa_pending'));
  }

  signChangePasswordToken(payload: Omit<ChangePasswordTokenPayload, 'type'>): Promise<string> {
    return Promise.resolve(
      jwt.sign({ ...payload, type: 'change_password' }, this.config.accessSecret, {
        expiresIn: this.getChangePasswordTtlSeconds(),
      }),
    );
  }

  verifyChangePasswordToken(token: string): Promise<ChangePasswordTokenPayload | null> {
    return Promise.resolve(this.verifyToken(token, this.config.accessSecret, 'change_password'));
  }

  signResetToken(payload: Omit<ResetTokenPayload, 'type' | 'jti'>): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = jwt.sign(
      { ...payload, jti, type: 'reset' },
      this.config.accessSecret,
      { expiresIn: this.getResetTtlSeconds() },
    );
    return Promise.resolve({ token, jti });
  }

  verifyResetToken(token: string): Promise<ResetTokenPayload | null> {
    return Promise.resolve(this.verifyToken(token, this.config.accessSecret, 'reset'));
  }

  getAccessTtlSeconds(): number {
    return this.config.accessTtlSeconds;
  }

  getRefreshTtlSeconds(): number {
    return this.config.refreshTtlSeconds;
  }

  getRefreshSessionTtlSeconds(): number {
    return this.config.refreshSessionTtlSeconds;
  }

  getVerifiedTtlSeconds(): number {
    return this.config.verifiedTtlSeconds;
  }

  getMfaPendingTtlSeconds(): number {
    return this.config.mfaPendingTtlSeconds ?? 300;
  }

  getChangePasswordTtlSeconds(): number {
    return this.config.changePasswordTtlSeconds ?? 600;
  }

  getResetTtlSeconds(): number {
    return this.config.resetTtlSeconds ?? 600;
  }

  private verifyToken<T extends { type: string }>(
    token: string,
    secret: string,
    expectedType: T['type'],
  ): T | null {
    try {
      const decoded = jwt.verify(token, secret) as T;
      return decoded.type === expectedType ? decoded : null;
    } catch {
      return null;
    }
  }
}
