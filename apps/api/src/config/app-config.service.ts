import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseJwtTtl } from '@hivork/infrastructure';

import { EnvConfig } from '../config/env.schema.js';

@Injectable()
export class AppConfigService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  get nodeEnv(): EnvConfig['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.config.get('API_PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get logLevel(): EnvConfig['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get corsOrigin(): string {
    return this.config.get('CORS_ORIGIN', { infer: true });
  }

  get otpTtlSeconds(): number {
    return this.config.get('OTP_TTL_SECONDS', { infer: true });
  }

  get otpRateLimitPerMinute(): number {
    return this.config.get('OTP_RATE_LIMIT_PER_MINUTE', { infer: true });
  }

  get mfaEncryptionKey(): string {
    return this.config.get('MFA_ENCRYPTION_KEY', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get jwtAccessTtlSeconds(): number {
    return parseJwtTtl(this.config.get('JWT_ACCESS_TTL', { infer: true }));
  }

  get jwtRefreshTtlSeconds(): number {
    return parseJwtTtl(this.config.get('JWT_REFRESH_TTL', { infer: true }));
  }

  get jwtRefreshSessionTtlSeconds(): number {
    return parseJwtTtl(this.config.get('JWT_REFRESH_SESSION_TTL', { infer: true }));
  }

  get captchaEnabled(): boolean {
    return this.config.get('CAPTCHA_ENABLED', { infer: true });
  }

  get captchaProvider(): EnvConfig['CAPTCHA_PROVIDER'] {
    return this.config.get('CAPTCHA_PROVIDER', { infer: true });
  }

  get captchaSecretKey(): string {
    return this.config.get('CAPTCHA_SECRET_KEY', { infer: true });
  }

  get captchaSiteKey(): string {
    return this.config.get('CAPTCHA_SITE_KEY', { infer: true });
  }

  get captchaBypassToken(): string {
    return this.config.get('CAPTCHA_BYPASS_TOKEN', { infer: true });
  }

  get ipAllowlistBypassToken(): string {
    return this.config.get('IP_ALLOWLIST_BYPASS_TOKEN', { infer: true });
  }

  get trustedProxyHops(): number {
    return this.config.get('TRUSTED_PROXY_HOPS', { infer: true });
  }

  get exportMaxRows(): number {
    return this.config.get('EXPORT_MAX_ROWS', { infer: true });
  }

  get pdfMaxRows(): number {
    return this.config.get('PDF_MAX_ROWS', { infer: true });
  }
}
