import type { UserMfaTotp } from '@hivork/domain';

export type CreateUserMfaTotpInput = {
  userId: string;
  secretEncrypted: string;
  createdById?: string;
};

export interface IUserMfaTotpRepository {
  findActiveByUserId(userId: string): Promise<UserMfaTotp | null>;
  findEnabledByUserId(userId: string): Promise<UserMfaTotp | null>;
  findByUserIdIncludingDeleted(userId: string): Promise<UserMfaTotp | null>;
  create(input: CreateUserMfaTotpInput): Promise<UserMfaTotp>;
  update(record: UserMfaTotp, updatedById?: string): Promise<void>;
  softDelete(userId: string, actorId: string, reason?: string): Promise<void>;
}
