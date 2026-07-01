import {
  type CreateUserMfaTotpInput,
  type IUserMfaTotpRepository,
  mapDomainError,
} from '@hivork/application';
import { UserMfaTotp } from '@hivork/domain';
import { Injectable } from '@nestjs/common';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  userMfaTotpToCreateData,
  userMfaTotpToDomain,
  userMfaTotpToUpdateData,
} from './mappers/user-mfa-totp.mapper.js';

@Injectable()
export class PrismaUserMfaTotpRepository implements IUserMfaTotpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserId(userId: string): Promise<UserMfaTotp | null> {
    const row = await this.prisma.userMfaTotp.findFirst({
      where: { userId, deletedAt: null },
    });
    return row ? userMfaTotpToDomain(row) : null;
  }

  async findEnabledByUserId(userId: string): Promise<UserMfaTotp | null> {
    const row = await this.prisma.userMfaTotp.findFirst({
      where: { userId, deletedAt: null, enabledAt: { not: null } },
    });
    return row ? userMfaTotpToDomain(row) : null;
  }

  async findByUserIdIncludingDeleted(userId: string): Promise<UserMfaTotp | null> {
    const row = await runWithBypassSoftDelete(() =>
      this.prisma.userMfaTotp.findFirst({
        where: { userId },
      }),
    );
    return row ? userMfaTotpToDomain(row) : null;
  }

  async create(input: CreateUserMfaTotpInput): Promise<UserMfaTotp> {
    let entity: UserMfaTotp;
    try {
      entity = UserMfaTotp.create(input.userId, input.secretEncrypted);
    } catch (error) {
      throw mapDomainError(error);
    }

    const row = await this.prisma.userMfaTotp.create({
      data: userMfaTotpToCreateData(entity, input.createdById),
    });

    return userMfaTotpToDomain(row);
  }

  async update(record: UserMfaTotp, updatedById?: string): Promise<void> {
    await this.prisma.userMfaTotp.update({
      where: { id: record.id },
      data: userMfaTotpToUpdateData(record, updatedById),
    });
  }

  async softDelete(userId: string, actorId: string, reason?: string): Promise<void> {
    const existing = await this.findActiveByUserId(userId);
    if (!existing) {
      return;
    }

    existing.softDelete(actorId, reason);
    await this.update(existing, actorId);
  }
}
