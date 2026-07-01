import { randomUUID } from 'node:crypto';

import type {
  IPhoneChangeSessionStore,
  PhoneChangeSession,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service.js';

type StoredPhoneChangeSession = Omit<PhoneChangeSession, 'expiresAt'>;

@Injectable()
export class RedisPhoneChangeSessionStore implements IPhoneChangeSessionStore {
  constructor(private readonly redis: RedisService) {}

  async create(
    session: Omit<PhoneChangeSession, 'expiresAt'>,
    ttlSeconds: number,
  ): Promise<string> {
    const sessionId = randomUUID();
    await this.persist(sessionId, session, ttlSeconds);
    await this.redis.client.set(this.userKey(session.userId), sessionId, 'EX', ttlSeconds);
    return sessionId;
  }

  async get(sessionId: string): Promise<PhoneChangeSession | null> {
    const key = this.sessionKey(sessionId);
    const raw = await this.redis.client.get(key);
    if (!raw) {
      return null;
    }

    const ttl = await this.redis.client.ttl(key);
    if (ttl <= 0) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredPhoneChangeSession;
    return {
      ...parsed,
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  }

  async update(
    sessionId: string,
    session: PhoneChangeSession,
    ttlSeconds: number,
  ): Promise<void> {
    const { expiresAt: _expiresAt, ...rest } = session;
    await this.persist(sessionId, rest, ttlSeconds);
    await this.redis.client.set(this.userKey(session.userId), sessionId, 'EX', ttlSeconds);
  }

  async delete(sessionId: string, userId: string): Promise<void> {
    await this.redis.client.del(this.sessionKey(sessionId));
    const active = await this.redis.client.get(this.userKey(userId));
    if (active === sessionId) {
      await this.redis.client.del(this.userKey(userId));
    }
  }

  async findActiveSessionIdForUser(userId: string): Promise<string | null> {
    return this.redis.client.get(this.userKey(userId));
  }

  private async persist(
    sessionId: string,
    session: StoredPhoneChangeSession,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.client.set(
      this.sessionKey(sessionId),
      JSON.stringify(session),
      'EX',
      ttlSeconds,
    );
  }

  private sessionKey(sessionId: string): string {
    return `phone:change:${sessionId}`;
  }

  private userKey(userId: string): string {
    return `phone:change:user:${userId}`;
  }
}
