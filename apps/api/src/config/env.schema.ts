import { z } from 'zod';

const DEV_MFA_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_REFRESH_SESSION_TTL: z.string().default('24h'),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  OTP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(3),
  MFA_ENCRYPTION_KEY: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CAPTCHA_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CAPTCHA_PROVIDER: z.enum(['turnstile', 'noop']).default('turnstile'),
  CAPTCHA_SECRET_KEY: z.string().default(''),
  CAPTCHA_SITE_KEY: z.string().default(''),
  CAPTCHA_BYPASS_TOKEN: z.string().default('test-bypass'),
  IP_ALLOWLIST_BYPASS_TOKEN: z.string().default(''),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  EXPORT_MAX_ROWS: z.coerce.number().int().positive().default(50_000),
  PDF_MAX_ROWS: z.coerce.number().int().positive().default(500),
  FILE_STORAGE_PATH: z.string().default('./data/file-storage'),
  FILE_STORAGE_SIGNING_SECRET: z.string().min(32).optional(),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const normalized = {
    ...config,
    MFA_ENCRYPTION_KEY:
      typeof config.MFA_ENCRYPTION_KEY === 'string' && config.MFA_ENCRYPTION_KEY.trim().length > 0
        ? config.MFA_ENCRYPTION_KEY
        : config.NODE_ENV === 'production'
          ? config.MFA_ENCRYPTION_KEY
          : DEV_MFA_ENCRYPTION_KEY,
  };

  const parsed = envSchema.safeParse(normalized);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}
