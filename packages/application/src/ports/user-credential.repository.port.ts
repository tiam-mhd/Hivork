import type { UserCredential } from '@hivork/domain';

export type CreateUserCredentialInput = {
  userId: string;
  passwordHash: string;
  mustChangePassword?: boolean;
  createdById?: string;
};

export interface IUserCredentialRepository {
  findByUserId(userId: string): Promise<UserCredential | null>;
  findByPhone(phone: string): Promise<UserCredential | null>;
  create(input: CreateUserCredentialInput): Promise<UserCredential>;
  update(credential: UserCredential): Promise<void>;
  softDelete(userId: string, actorId: string, reason?: string): Promise<void>;
}
