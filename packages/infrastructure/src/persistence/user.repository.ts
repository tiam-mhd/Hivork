import {
  type IUserRepository,
  type PhoneConflictKind,
  type UserAuthRecord,
  ApplicationError,
  mapDomainError,
} from '@hivork/application';
import { User } from '@hivork/domain';
import { Injectable } from '@nestjs/common';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<UserAuthRecord | null> {
    const row = await this.prisma.user.findFirst({
      where: { phone, deletedAt: null },
    });
    return row ? this.toAuthRecord(row) : null;
  }

  async findById(id: string): Promise<UserAuthRecord | null> {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? this.toAuthRecord(row) : null;
  }

  async findOrCreateByPhone(phone: string, name?: string): Promise<UserAuthRecord> {
    const existing = await this.findByPhone(phone);
    if (existing) {
      return existing;
    }

    let entity: User;
    try {
      entity = User.create(phone, name);
    } catch (error) {
      throw mapDomainError(error);
    }

    try {
      const row = await this.prisma.user.create({
        data: {
          id: entity.id,
          phone: entity.phone,
          name: entity.name,
          status: entity.status,
        },
      });
      return this.toAuthRecord(row);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        const raced = await this.findByPhone(phone);
        if (raced) return raced;
      }
      throw error;
    }
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async recordUserLogin(userId: string, input: { ipAddress?: string; at: Date }): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: input.at,
        lastLoginIp: input.ipAddress ?? null,
      },
    });
  }

  async updatePhone(userId: string, newPhone: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: newPhone,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ApplicationError(
          'PHONE_ALREADY_IN_USE',
          'This phone number is already registered.',
          409,
        );
      }
      throw error;
    }
  }

  async getPhoneConflict(newPhone: string, excludeUserId: string): Promise<PhoneConflictKind> {
    const row = await this.prisma.user.findFirst({
      where: { phone: newPhone, deletedAt: null },
    });

    if (!row) {
      return 'available';
    }

    if (row.id === excludeUserId) {
      return 'same';
    }

    const hasStaff = await this.hasActiveStaffMembership(row.id);
    if (hasStaff) {
      return 'staff_user';
    }

    const globalCustomer = await this.prisma.globalCustomer.findFirst({
      where: { userId: row.id, deletedAt: null },
    });

    if (globalCustomer) {
      return 'customer_only';
    }

    return 'staff_user';
  }

  async hasActiveStaffMembership(userId: string): Promise<boolean> {
    const count = await this.prisma.staff.count({
      where: { userId, deletedAt: null },
    });
    return count > 0;
  }

  async pseudonymizePhone(userId: string): Promise<void> {
    await runWithBypassSoftDelete(async () => {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: `deleted_${userId}`,
          name: null,
          version: { increment: 1 },
        },
      });
    });
  }

  private toAuthRecord(row: {
    id: string;
    phone: string;
    name: string | null;
    status: 'active' | 'suspended';
    lastLoginAt: Date | null;
  }): UserAuthRecord {
    return {
      id: row.id,
      phone: row.phone,
      name: row.name,
      status: row.status,
      lastLoginAt: row.lastLoginAt,
    };
  }
}
