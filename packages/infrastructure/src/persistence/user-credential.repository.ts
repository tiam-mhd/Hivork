import {
  type CreateUserCredentialInput,
  type IUserCredentialRepository,
  mapDomainError,
} from '@hivork/application';
import { UserCredential } from '@hivork/domain';
import { Injectable } from '@nestjs/common';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  userCredentialToCreateData,
  userCredentialToDomain,
  userCredentialToUpdateData,
} from './mappers/user-credential.mapper.js';

@Injectable()
export class PrismaUserCredentialRepository implements IUserCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserCredential | null> {
    const row = await this.prisma.userCredential.findFirst({
      where: { userId, deletedAt: null },
    });
    return row ? userCredentialToDomain(row) : null;
  }

  async findByPhone(phone: string): Promise<UserCredential | null> {
    const row = await this.prisma.userCredential.findFirst({
      where: {
        deletedAt: null,
        user: { phone, deletedAt: null },
      },
    });
    return row ? userCredentialToDomain(row) : null;
  }

  async create(input: CreateUserCredentialInput): Promise<UserCredential> {
    let entity: UserCredential;
    try {
      entity = UserCredential.create(input.userId, input.passwordHash, {
        mustChangePassword: input.mustChangePassword,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const row = await this.prisma.userCredential.create({
      data: userCredentialToCreateData(entity, input.createdById),
    });

    return userCredentialToDomain(row);
  }

  async update(credential: UserCredential): Promise<void> {
    const data = userCredentialToUpdateData(credential);
    await this.prisma.userCredential.update({
      where: { id: credential.id },
      data,
    });
  }

  async softDelete(userId: string, actorId: string, reason?: string): Promise<void> {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      return;
    }

    existing.softDelete(actorId, reason);
    await this.update(existing);
  }

  async findByUserIdIncludingDeleted(userId: string): Promise<UserCredential | null> {
    const row = await runWithBypassSoftDelete(() =>
      this.prisma.userCredential.findFirst({
        where: { userId },
      }),
    );
    return row ? userCredentialToDomain(row) : null;
  }
}
