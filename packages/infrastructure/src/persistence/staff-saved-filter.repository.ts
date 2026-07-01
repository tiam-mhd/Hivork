import type {
  CreateStaffSavedFilterInput,
  IStaffSavedFilterRepository,
  RestoreStaffSavedFilterInput,
  SoftDeleteStaffSavedFilterInput,
  StaffSavedFilterRecord,
  UpdateStaffSavedFilterInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { StaffSavedFilter as PrismaStaffSavedFilter } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: PrismaStaffSavedFilter): StaffSavedFilterRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    staffId: row.staffId,
    resourceKey: row.resourceKey,
    name: row.name,
    description: row.description,
    filterAst: row.filterAst as StaffSavedFilterRecord['filterAst'],
    isDefault: row.isDefault,
    visibility: row.visibility,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
  };
}

@Injectable()
export class PrismaStaffSavedFilterRepository implements IStaffSavedFilterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(
    tenantId: string,
    staffId: string,
    resourceKey: string,
  ): Promise<StaffSavedFilterRecord[]> {
    const rows = await this.prisma.staffSavedFilter.findMany({
      where: { tenantId, staffId, resourceKey, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return rows.map(toRecord);
  }

  async findActiveById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedFilterRecord | null> {
    const row = await this.prisma.staffSavedFilter.findFirst({
      where: { id, tenantId, staffId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }

  async findDeletedById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedFilterRecord | null> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.staffSavedFilter.findFirst({
        where: { id, tenantId, staffId, deletedAt: { not: null } },
      });

      return row ? toRecord(row) : null;
    });
  }

  async findActiveByName(
    tenantId: string,
    staffId: string,
    resourceKey: string,
    name: string,
  ): Promise<StaffSavedFilterRecord | null> {
    const row = await this.prisma.staffSavedFilter.findFirst({
      where: {
        tenantId,
        staffId,
        resourceKey,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    return row ? toRecord(row) : null;
  }

  async countActive(tenantId: string, staffId: string, resourceKey: string): Promise<number> {
    return this.prisma.staffSavedFilter.count({
      where: { tenantId, staffId, resourceKey, deletedAt: null },
    });
  }

  async create(input: CreateStaffSavedFilterInput): Promise<StaffSavedFilterRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.staffSavedFilter.updateMany({
          where: {
            tenantId: input.tenantId,
            staffId: input.staffId,
            resourceKey: input.resourceKey,
            deletedAt: null,
            isDefault: true,
          },
          data: { isDefault: false, updatedById: input.createdById },
        });
      }

      const row = await tx.staffSavedFilter.create({
        data: {
          tenantId: input.tenantId,
          staffId: input.staffId,
          resourceKey: input.resourceKey,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          filterAst: input.filterAst as Prisma.InputJsonValue,
          isDefault: input.isDefault ?? false,
          visibility: input.visibility ?? 'private',
          createdById: input.createdById,
          updatedById: input.createdById,
        },
      });

      return toRecord(row);
    });
  }

  async update(input: UpdateStaffSavedFilterInput): Promise<StaffSavedFilterRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.staffSavedFilter.findFirst({
        where: {
          id: input.id,
          tenantId: input.tenantId,
          staffId: input.staffId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new Error('NOT_FOUND');
      }

      if (existing.version !== input.version) {
        throw new Error('VERSION_CONFLICT');
      }

      if (input.isDefault) {
        await tx.staffSavedFilter.updateMany({
          where: {
            tenantId: input.tenantId,
            staffId: input.staffId,
            resourceKey: existing.resourceKey,
            deletedAt: null,
            isDefault: true,
            id: { not: input.id },
          },
          data: { isDefault: false, updatedById: input.updatedById },
        });
      }

      const row = await tx.staffSavedFilter.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.filterAst !== undefined
            ? { filterAst: input.filterAst as Prisma.InputJsonValue }
            : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          updatedById: input.updatedById,
          version: { increment: 1 },
        },
      });

      return toRecord(row);
    });
  }

  async softDelete(input: SoftDeleteStaffSavedFilterInput): Promise<StaffSavedFilterRecord> {
    const row = await this.prisma.staffSavedFilter.update({
      where: { id: input.id },
      data: {
        deletedAt: new Date(),
        deletedById: input.deletedById,
        deleteReason: input.deleteReason ?? null,
        isDefault: false,
        updatedById: input.deletedById,
        version: { increment: 1 },
      },
    });

    return toRecord(row);
  }

  async restore(input: RestoreStaffSavedFilterInput): Promise<StaffSavedFilterRecord> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.staffSavedFilter.update({
        where: { id: input.id },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          updatedById: input.restoredById,
          version: { increment: 1 },
        },
      });

      return toRecord(row);
    });
  }
}
