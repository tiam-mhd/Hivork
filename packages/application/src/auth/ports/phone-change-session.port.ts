export type PhoneChangeStep = 'password_verified' | 'current_verified' | 'new_sent';

export type PhoneChangeSession = {
  userId: string;
  staffId: string;
  tenantId: string;
  currentPhone: string;
  step: PhoneChangeStep;
  newPhone?: string;
  currentVerifiedAt?: string;
  expiresAt: Date;
};

export interface IPhoneChangeSessionStore {
  create(
    session: Omit<PhoneChangeSession, 'expiresAt'>,
    ttlSeconds: number,
  ): Promise<string>;
  get(sessionId: string): Promise<PhoneChangeSession | null>;
  update(sessionId: string, session: PhoneChangeSession, ttlSeconds: number): Promise<void>;
  delete(sessionId: string, userId: string): Promise<void>;
  findActiveSessionIdForUser(userId: string): Promise<string | null>;
}

export const PHONE_CHANGE_SESSION_TTL_SECONDS = 1800;
