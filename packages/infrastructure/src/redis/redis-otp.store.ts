import type { AuthActor, IOtpStore, OtpPurpose, OtpRecord } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

@Injectable()
export class RedisOtpStore implements IOtpStore {
  constructor(private readonly redis: RedisService) {}

  async save(params: {
    actor: AuthActor;
    phone: string;
    purpose?: OtpPurpose;
    record: OtpRecord;
    ttlSeconds: number;
  }): Promise<void> {
    const key = this.key(params);
    await this.redis.client.set(key, JSON.stringify(params.record), 'EX', params.ttlSeconds);
  }

  async get(params: {
    actor: AuthActor;
    phone: string;
    purpose?: OtpPurpose;
  }): Promise<OtpRecord | null> {
    const raw = await this.redis.client.get(this.key(params));
    if (!raw) return null;
    return JSON.parse(raw) as OtpRecord;
  }

  async delete(params: {
    actor: AuthActor;
    phone: string;
    purpose?: OtpPurpose;
  }): Promise<void> {
    await this.redis.client.del(this.key(params));
  }

  async update(params: {
    actor: AuthActor;
    phone: string;
    purpose?: OtpPurpose;
    record: OtpRecord;
  }): Promise<void> {
    const key = this.key(params);
    const ttl = await this.redis.client.ttl(key);
    if (ttl <= 0) return;
    await this.redis.client.set(key, JSON.stringify(params.record), 'EX', ttl);
  }

  key(params: { actor: AuthActor; phone: string; purpose?: OtpPurpose }): string {
    if (params.purpose === 'mfa_step_up') {
      return `otp:mfa_step_up:${params.actor}:${params.phone}`;
    }
    if (params.purpose === 'password_reset') {
      return `otp:password_reset:${params.actor}:${params.phone}`;
    }
    if (params.purpose === 'phone_change_current') {
      return `otp:phone_change_current:${params.actor}:${params.phone}`;
    }
    if (params.purpose === 'phone_change_new') {
      return `otp:phone_change_new:${params.actor}:${params.phone}`;
    }
    return `otp:${params.actor}:${params.phone}`;
  }
}
