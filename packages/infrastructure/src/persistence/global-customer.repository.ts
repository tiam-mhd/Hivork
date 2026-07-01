import {
  GlobalCustomerAuthRecord,
  GlobalCustomerDetailRecord,
  GlobalCustomerProfileInput,
  IGlobalCustomerRepository,
  mapDomainError,
} from '@hivork/application';
import { GlobalCustomer } from '@hivork/domain';
import { Injectable } from '@nestjs/common';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

const userPhoneSelect = { phone: true } as const;

type GlobalCustomerRow = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  nationalId: string | null;
  birthDate: Date | null;
  gender: 'male' | 'female' | 'other' | 'unspecified' | null;
  address: string | null;
  preferredContactChannel: 'telegram' | 'bale' | 'sms' | 'phone' | null;
  marketingOptIn: boolean;
  status: 'active' | 'suspended';
  deletedAt: Date | null;
  user: { phone: string };
};

@Injectable()
export class PrismaGlobalCustomerRepository implements IGlobalCustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<GlobalCustomerAuthRecord | null> {
    const row = await this.prisma.globalCustomer.findFirst({
      where: { deletedAt: null, user: { phone, deletedAt: null } },
      include: { user: { select: userPhoneSelect } },
    });
    if (!row) return null;

    return this.toAuthRecord(row);
  }

  async findByUserId(userId: string): Promise<GlobalCustomerAuthRecord | null> {
    const row = await this.prisma.globalCustomer.findFirst({
      where: { userId, deletedAt: null },
      include: { user: { select: userPhoneSelect } },
    });
    if (!row) return null;

    return this.toAuthRecord(row);
  }

  async findById(id: string): Promise<GlobalCustomerAuthRecord | null> {
    const row = await this.prisma.globalCustomer.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: userPhoneSelect } },
    });
    if (!row) return null;

    return this.toAuthRecord(row);
  }

  async findByPhoneIncludingDeleted(phone: string): Promise<GlobalCustomerDetailRecord | null> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.globalCustomer.findFirst({
        where: { user: { phone } },
        include: { user: { select: userPhoneSelect } },
      });
      return row ? this.toDetailRecord(row) : null;
    });
  }

  async create(userId: string, name?: string): Promise<GlobalCustomerAuthRecord> {
    const entity = GlobalCustomer.create(userId, name);
    const row = await this.prisma.globalCustomer.create({
      data: {
        id: entity.id,
        userId: entity.userId,
        name: entity.name,
        status: entity.status,
      },
      include: { user: { select: userPhoneSelect } },
    });

    return this.toAuthRecord(row);
  }

  async createWithProfile(
    userId: string,
    profile: GlobalCustomerProfileInput,
  ): Promise<GlobalCustomerDetailRecord> {
    const entity = GlobalCustomer.create(userId, profile.name ?? undefined);
    const row = await this.prisma.globalCustomer.create({
      data: {
        id: entity.id,
        userId: entity.userId,
        name: entity.name,
        status: entity.status,
        ...this.profileToData(profile),
      },
      include: { user: { select: userPhoneSelect } },
    });

    return this.toDetailRecord(row);
  }

  async updateProfile(
    id: string,
    profile: GlobalCustomerProfileInput,
  ): Promise<GlobalCustomerDetailRecord> {
    const row = await runWithBypassSoftDelete(async () =>
      this.prisma.globalCustomer.findFirst({
        where: { id },
        include: { user: { select: userPhoneSelect } },
      }),
    );

    if (!row) {
      throw new Error('Global customer not found for profile update');
    }

    const entity = this.toDomain(row);

    if (profile.name !== undefined && profile.name !== null) {
      try {
        entity.updateName(profile.name);
      } catch (error) {
        throw mapDomainError(error);
      }
    }

    const updated = await this.prisma.globalCustomer.update({
      where: { id },
      data: {
        name: entity.name,
        ...this.profileToData(profile),
        version: { increment: 1 },
      },
      include: { user: { select: userPhoneSelect } },
    });

    return this.toDetailRecord(updated);
  }

  async restoreById(id: string): Promise<GlobalCustomerDetailRecord> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.globalCustomer.findFirst({
        where: { id },
        include: { user: { select: userPhoneSelect } },
      });
      if (!row) {
        throw new Error('Global customer not found for restore');
      }

      const entity = this.toDomain(row);

      try {
        entity.restore();
      } catch (error) {
        throw mapDomainError(error);
      }

      const updated = await this.prisma.globalCustomer.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedById: null,
          version: { increment: 1 },
        },
        include: { user: { select: userPhoneSelect } },
      });

      return this.toDetailRecord(updated);
    });
  }

  async pseudonymizeById(id: string): Promise<void> {
    const row = await runWithBypassSoftDelete(async () =>
      this.prisma.globalCustomer.findFirst({ where: { id } }),
    );
    if (!row) return;

    const entity = GlobalCustomer.reconstitute({
      id: row.id,
      userId: row.userId,
      name: row.name,
      status: row.status,
      deletedAt: row.deletedAt,
      deletedById: row.deletedById,
      pseudonymizedAt: row.pseudonymizedAt,
    });

    entity.pseudonymize();

    await this.prisma.globalCustomer.update({
      where: { id },
      data: {
        name: entity.name,
        pseudonymizedAt: entity.pseudonymizedAt,
        deletedAt: entity.deletedAt,
        version: { increment: 1 },
      },
    });

    await this.prisma.user.update({
      where: { id: row.userId },
      data: {
        phone: `deleted_${row.userId}`,
        name: null,
        version: { increment: 1 },
      },
    });
  }

  private profileToData(profile: GlobalCustomerProfileInput) {
    const data: {
      email?: string | null;
      nationalId?: string | null;
      birthDate?: Date | null;
      gender?: 'male' | 'female' | 'other' | 'unspecified' | null;
      address?: string | null;
      preferredContactChannel?: 'telegram' | 'bale' | 'sms' | 'phone' | null;
      marketingOptIn?: boolean;
    } = {};

    if (profile.email !== undefined) data.email = profile.email;
    if (profile.nationalId !== undefined) data.nationalId = profile.nationalId;
    if (profile.birthDate !== undefined) data.birthDate = profile.birthDate;
    if (profile.gender !== undefined) data.gender = profile.gender;
    if (profile.address !== undefined) data.address = profile.address;
    if (profile.preferredContactChannel !== undefined) {
      data.preferredContactChannel = profile.preferredContactChannel;
    }
    if (profile.marketingOptIn !== undefined) data.marketingOptIn = profile.marketingOptIn;

    return data;
  }

  private toDomain(row: GlobalCustomerRow): GlobalCustomer {
    return GlobalCustomer.reconstitute({
      id: row.id,
      userId: row.userId,
      name: row.name,
      status: row.status,
      deletedAt: row.deletedAt,
      deletedById: null,
      pseudonymizedAt: null,
    });
  }

  private toAuthRecord(row: GlobalCustomerRow): GlobalCustomerAuthRecord {
    return {
      id: row.id,
      userId: row.userId,
      phone: row.user.phone,
      name: row.name,
      status: row.status,
    };
  }

  private toDetailRecord(row: GlobalCustomerRow): GlobalCustomerDetailRecord {
    return {
      ...this.toAuthRecord(row),
      email: row.email,
      nationalId: row.nationalId,
      birthDate: row.birthDate,
      gender: row.gender,
      address: row.address,
      preferredContactChannel: row.preferredContactChannel,
      marketingOptIn: row.marketingOptIn,
      deletedAt: row.deletedAt,
    };
  }
}
