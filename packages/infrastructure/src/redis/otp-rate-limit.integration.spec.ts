import { RequestOtpUseCase } from '@hivork/application';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { probeRedis } from '../test/probe-redis.js';
import { OtpRateLimiterService } from './rate-limiter.service.js';
import { RedisOtpStore } from './redis-otp.store.js';
import { RedisService } from './redis.service.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const testPhone = '09996665544';
const redisAvailable = await probeRedis(redisUrl);
const describeIfRedis = redisAvailable ? describe : describe.skip;

describeIfRedis('OTP rate limit integration', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let useCase: RequestOtpUseCase;

  beforeAll(async () => {
    await redis.connect();
    const redisService = new RedisService(redisUrl);
    await redisService.onModuleInit();

    const otpStore = new RedisOtpStore(redisService);
    const rateLimiter = new OtpRateLimiterService(redisService, 3);
    const sms = { send: vi.fn().mockResolvedValue(undefined) };

    useCase = new RequestOtpUseCase(otpStore, rateLimiter, sms, 120);
  });

  afterAll(async () => {
    await redis.del(`otp:staff:${testPhone}`, `ratelimit:otp:${testPhone}`);
    await redis.quit();
  });

  it('rejects the 4th OTP request within a minute with OTP_RATE_LIMITED', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        useCase.execute({ phone: testPhone, actor: 'staff' }),
      ).resolves.toEqual({ success: true, expiresIn: 120 });
    }

    await expect(
      useCase.execute({ phone: testPhone, actor: 'staff' }),
    ).rejects.toMatchObject({
      code: 'OTP_RATE_LIMITED',
      httpStatus: 429,
    });

    const count = await redis.get(`ratelimit:otp:${testPhone}`);
    expect(Number(count)).toBe(4);
  });
});
