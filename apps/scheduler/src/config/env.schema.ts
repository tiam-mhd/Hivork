import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SCHEDULER_PORT: z.coerce.number().int().positive().default(4002),
  REDIS_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}

export const HIVORK_JOBS_QUEUE = 'hivork-jobs' as const;
export const HEALTH_CHECK_JOB = 'health-check' as const;
export const OUTBOX_PROCESS_JOB = 'outbox-process' as const;
export const STAFF_SESSION_EXPIRE_JOB = 'staff-session-expire' as const;
