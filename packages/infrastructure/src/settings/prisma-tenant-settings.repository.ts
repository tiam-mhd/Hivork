import {
  type ITenantSettingsRepository,
  type TenantSettingRecord,
  type UpsertTenantSettingInput,
  type OutboxTransaction,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

type TenantSettingWriteClient = Pick<PrismaService, 'tenantSetting'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): TenantSettingWriteClient {
  return (tx ?? prisma) as TenantSettingWriteClient;
}

@Injectable()
export class PrismaTenantSettingsRepository implements ITenantSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByModule(
    tenantId: string,
    module: string,
    tx?: OutboxTransaction,
  ): Promise<Record<string, unknown>> {
    const client = resolveClient(this.prisma, tx);

    const rows = await client.tenantSetting.findMany({
      where: { tenantId, module, deletedAt: null },
      select: { key: true, value: true },
    });

    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async upsert(
    input: UpsertTenantSettingInput,
    tx?: OutboxTransaction,
  ): Promise<TenantSettingRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.tenantSetting.upsert({
      where: {
        tenantId_module_key: {
          tenantId: input.tenantId,
          module: input.module,
          key: input.key,
        },
      },
      create: {
        tenantId: input.tenantId,
        module: input.module,
        key: input.key,
        value: input.value as Prisma.InputJsonValue,
        createdById: input.updatedById,
        updatedById: input.updatedById,
      },
      update: {
        value: input.value as Prisma.InputJsonValue,
        updatedById: input.updatedById,
        deletedAt: null,
      },
    });

    return {
      id: row.id,
      tenantId: row.tenantId,
      module: row.module,
      key: row.key,
      value: row.value,
    };
  }
}
