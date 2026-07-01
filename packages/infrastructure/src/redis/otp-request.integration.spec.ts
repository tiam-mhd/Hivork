import { RequestOtpUseCase } from '@hivork/application';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { probeRedis } from '../test/probe-redis.js';
import { OtpRateLimiterService } from './rate-limiter.service.js';
import { RedisOtpStore } from './redis-otp.store.js';
import { RedisService } from './redis.service.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const testPhone = '09998887766';
const redisAvailable = await probeRedis(redisUrl);
const describeIfRedis = redisAvailable ? describe : describe.skip;

describeIfRedis('OTP request integration', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let useCase: RequestOtpUseCase;
  let otpStore: RedisOtpStore;

  beforeAll(async () => {
    await redis.connect();
    const redisService = new RedisService(redisUrl);
    await redisService.onModuleInit();

    otpStore = new RedisOtpStore(redisService);
    const rateLimiter = new OtpRateLimiterService(redisService, 10);
    const sms = { send: vi.fn().mockResolvedValue(undefined) };

    useCase = new RequestOtpUseCase(otpStore, rateLimiter, sms, 120);
  });

  afterAll(async () => {
    await redis.del(`otp:staff:${testPhone}`, `ratelimit:otp:${testPhone}`);
    await redis.quit();
  });

  it('stores otp in redis after a valid request', async () => {
    const result = await useCase.execute({ phone: testPhone, actor: 'staff' });

    expect(result).toEqual({ success: true, expiresIn: 120 });

    const raw = await redis.get(otpStore.key('staff', testPhone));
    expect(raw).not.toBeNull();
  });
});
