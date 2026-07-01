import type {
  CreateStaffSavedViewInput,
  IStaffSavedViewRepository,
  ListStaffSavedViewsResult,
  RestoreStaffSavedViewInput,
  SoftDeleteStaffSavedViewInput,
  StaffSavedViewRecord,
  UpdateStaffSavedViewInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaStaffSavedFilter, StaffSavedView as PrismaStaffSavedView } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

type SavedViewRow = PrismaStaffSavedView & {
  savedFilter: PrismaStaffSavedFilter | null;
  staff: { name: string } | null;
};

function toRecord(row: SavedViewRow): StaffSavedViewRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    staffId: row.staffId,
    resourceKey: row.resourceKey,
    name: row.name,
    description: row.description,
    columnState: row.columnState as StaffSavedViewRecord['columnState'],
    sortBy: row.sortBy,
    sortDir: row.sortDir as StaffSavedViewRecord['sortDir'],
    search: row.search,
    savedFilterId: row.savedFilterId,
    filterAst: (row.savedFilter?.filterAst as StaffSavedViewRecord['filterAst']) ?? null,
    isDefault: row.isDefault,
    visibility: row.visibility as StaffSavedViewRecord['visibility'],
    ownerName: row.staff?.name ?? null,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
  };
}

@Injectable()
export class PrismaStaffSavedViewRepository implements IStaffSavedViewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAccessible(
    tenantId: string,
    staffId: string,
    resourceKey: string,
    includeShared: boolean,
  ): Promise<ListStaffSavedViewsResult> {
    const [mineRows, sharedRows] = await Promise.all([
      this.prisma.staffSavedView.findMany({
        where: { tenantId, staffId, resourceKey, deletedAt: null },
        include: {
          savedFilter: true,
          staff: { select: { name: true } },
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      includeShared
        ? this.prisma.staffSavedView.findMany({
            where: {
              tenantId,
              resourceKey,
              deletedAt: null,
              visibility: 'shared',
              staffId: { not: staffId },
            },
            include: {
              savedFilter: true,
              staff: { select: { name: true } },
            },
            orderBy: [{ name: 'asc' }],
          })
        : Promise.resolve([] as SavedViewRow[]),
    ]);

    return {
      mine: mineRows.map(toRecord),
      shared: sharedRows.map(toRecord),
    };
  }

  async findOwnedActiveById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedViewRecord | null> {
    const row = await this.prisma.staffSavedView.findFirst({
      where: { id, tenantId, staffId, deletedAt: null },
      include: {
        savedFilter: true,
        staff: { select: { name: true } },
      },
    });

    return row ? toRecord(row) : null;
  }

  async findAccessibleById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedViewRecord | null> {
    const row = await this.prisma.staffSavedView.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
        OR: [{ staffId }, { visibility: 'shared' }],
      },
      include: {
        savedFilter: true,
        staff: { select: { name: true } },
      },
    });

    return row ? toRecord(row) : null;
  }

  async findDeletedById(
    id: string,
    tenantId: string,
    staffId: string,
  ): Promise<StaffSavedViewRecord | null> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.staffSavedView.findFirst({
        where: { id, tenantId, staffId, deletedAt: { not: null } },
        include: {
          savedFilter: true,
          staff: { select: { name: true } },
        },
      });

      return row ? toRecord(row) : null;
    });
  }

  async findActiveByName(
    tenantId: string,
    staffId: string,
    resourceKey: string,
    name: string,
  ): Promise<StaffSavedViewRecord | null> {
    const row = await this.prisma.staffSavedView.findFirst({
      where: {
        tenantId,
        staffId,
        resourceKey,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
      include: {
        savedFilter: true,
        staff: { select: { name: true } },
      },
    });

    return row ? toRecord(row) : null;
  }

  async countActive(tenantId: string, staffId: string, resourceKey: string): Promise<number> {
    return this.prisma.staffSavedView.count({
      where: { tenantId, staffId, resourceKey, deletedAt: null },
    });
  }

  async create(input: CreateStaffSavedViewInput): Promise<StaffSavedViewRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.staffSavedView.updateMany({
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

      const row = await tx.staffSavedView.create({
        data: {
          tenantId: input.tenantId,
          staffId: input.staffId,
          resourceKey: input.resourceKey,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          columnState: input.columnState as Prisma.InputJsonValue,
          sortBy: input.sortBy,
          sortDir: input.sortDir,
          search: input.search?.trim() || null,
          savedFilterId: input.savedFilterId,
          isDefault: input.isDefault ?? false,
          visibility: input.visibility ?? 'private',
          createdById: input.createdById,
          updatedById: input.createdById,
        },
        include: {
          savedFilter: true,
          staff: { select: { name: true } },
        },
      });

      return toRecord(row);
    });
  }

  async update(input: UpdateStaffSavedViewInput): Promise<StaffSavedViewRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.staffSavedView.findFirst({
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
        await tx.staffSavedView.updateMany({
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

      const row = await tx.staffSavedView.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.columnState !== undefined
            ? { columnState: input.columnState as Prisma.InputJsonValue }
            : {}),
          ...(input.sortBy !== undefined ? { sortBy: input.sortBy } : {}),
          ...(input.sortDir !== undefined ? { sortDir: input.sortDir } : {}),
          ...(input.search !== undefined ? { search: input.search } : {}),
          ...(input.savedFilterId !== undefined ? { savedFilterId: input.savedFilterId } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
          updatedById: input.updatedById,
          version: { increment: 1 },
        },
        include: {
          savedFilter: true,
          staff: { select: { name: true } },
        },
      });

      return toRecord(row);
    });
  }

  async softDelete(input: SoftDeleteStaffSavedViewInput): Promise<StaffSavedViewRecord> {
    const row = await this.prisma.staffSavedView.update({
      where: { id: input.id },
      data: {
        deletedAt: new Date(),
        deletedById: input.deletedById,
        deleteReason: input.deleteReason ?? null,
        isDefault: false,
        updatedById: input.deletedById,
        version: { increment: 1 },
      },
      include: {
        savedFilter: true,
        staff: { select: { name: true } },
      },
    });

    return toRecord(row);
  }

  async restore(input: RestoreStaffSavedViewInput): Promise<StaffSavedViewRecord> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.staffSavedView.update({
        where: { id: input.id },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          updatedById: input.restoredById,
          version: { increment: 1 },
        },
        include: {
          savedFilter: true,
          staff: { select: { name: true } },
        },
      });

      return toRecord(row);
    });
  }
}
