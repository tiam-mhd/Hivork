import type {
  CreateCustomerNoteInput,
  CustomerNoteRecord,
  CustomerNoteRecordWithAuthor,
  ICustomerNoteRepository,
  ListCustomerNotesOptions,
  RestoreCommand,
  SoftDeleteCommand,
  UpdateCustomerNoteInput,
} from '@hivork/application';
import { ApplicationError, mapDomainError } from '@hivork/application';
import { CustomerNote } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import type { CustomerNote as CustomerNoteRow, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: CustomerNoteRow): CustomerNoteRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantCustomerId: row.tenantCustomerId,
    body: row.body,
    isPinned: row.isPinned,
    authorStaffId: row.authorStaffId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    updatedById: row.updatedById,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
    metadata: row.metadata as Record<string, unknown> | null,
  };
}

function buildCursorWhere(
  cursor: NonNullable<ListCustomerNotesOptions['cursor']>,
): Prisma.CustomerNoteWhereInput {
  if (cursor.isPinned) {
    return {
      OR: [
        { isPinned: false },
        {
          isPinned: true,
          createdAt: { lt: cursor.createdAt },
        },
        {
          isPinned: true,
          createdAt: cursor.createdAt,
          id: { lt: cursor.id },
        },
      ],
    };
  }

  return {
    isPinned: false,
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        createdAt: cursor.createdAt,
        id: { lt: cursor.id },
      },
    ],
  };
}

@Injectable()
export class PrismaCustomerNoteRepository implements ICustomerNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<CustomerNoteRecord | null> {
    const row = await this.prisma.customerNote.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    return row ? toRecord(row) : null;
  }

  async listByCustomer(
    options: ListCustomerNotesOptions,
  ): Promise<CustomerNoteRecordWithAuthor[]> {
    const limit = options.limit ?? 20;

    const rows = await this.prisma.customerNote.findMany({
      where: {
        tenantId: options.tenantId,
        tenantCustomerId: options.tenantCustomerId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(options.cursor ? buildCursorWhere(options.cursor) : {}),
      },
      include: {
        authorStaff: {
          select: { name: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    return rows.map((row) => ({
      ...toRecord(row),
      authorName: row.authorStaff.name,
    }));
  }

  async create(input: CreateCustomerNoteInput): Promise<CustomerNoteRecord> {
    let entity: CustomerNote;
    try {
      entity = CustomerNote.create({
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        body: input.body,
        authorStaffId: input.authorStaffId,
        isPinned: input.isPinned,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const row = await this.prisma.customerNote.create({
      data: {
        id: entity.id,
        tenantId: entity.tenantId,
        tenantCustomerId: entity.tenantCustomerId,
        body: entity.body,
        isPinned: entity.isPinned,
        authorStaffId: entity.authorStaffId,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: input.metadata ?? undefined,
      },
    });

    return toRecord(row);
  }

  async update(input: UpdateCustomerNoteInput): Promise<CustomerNoteRecord> {
    const row = await this.prisma.customerNote.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('NOTE_NOT_FOUND', 'Customer note was not found.', 404);
    }

    const entity = CustomerNote.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      tenantCustomerId: row.tenantCustomerId,
      body: row.body,
      isPinned: row.isPinned,
      authorStaffId: row.authorStaffId,
      deletedAt: row.deletedAt,
      deletedById: row.deletedById,
      deleteReason: row.deleteReason,
    });

    try {
      if (input.body !== undefined) {
        entity.updateBody(input.body);
      }
      if (input.isPinned === true) {
        entity.pin();
      } else if (input.isPinned === false) {
        entity.unpin();
      }
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await this.prisma.customerNote.update({
      where: { id: row.id },
      data: {
        body: entity.body,
        isPinned: entity.isPinned,
        updatedById: input.updatedById,
      },
    });

    return toRecord(updated);
  }

  async softDelete(command: SoftDeleteCommand): Promise<CustomerNoteRecord> {
    const row = await this.prisma.customerNote.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('NOTE_NOT_FOUND', 'Customer note was not found.', 404);
    }

    const entity = CustomerNote.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      tenantCustomerId: row.tenantCustomerId,
      body: row.body,
      isPinned: row.isPinned,
      authorStaffId: row.authorStaffId,
      deletedAt: row.deletedAt,
      deletedById: row.deletedById,
      deleteReason: row.deleteReason,
    });

    try {
      entity.softDelete(command.deletedById, command.deleteReason);
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await this.prisma.customerNote.update({
      where: { id: row.id },
      data: {
        deletedAt: new Date(),
        deletedById: entity.deletedById,
        deleteReason: entity.deleteReason,
        isPinned: entity.isPinned,
        updatedById: command.deletedById,
      },
    });

    return toRecord(updated);
  }

  async restore(command: RestoreCommand): Promise<CustomerNoteRecord> {
    const row = await this.prisma.customerNote.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('NOTE_NOT_FOUND', 'Customer note was not found.', 404);
    }

    const entity = CustomerNote.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      tenantCustomerId: row.tenantCustomerId,
      body: row.body,
      isPinned: row.isPinned,
      authorStaffId: row.authorStaffId,
      deletedAt: row.deletedAt,
      deletedById: row.deletedById,
      deleteReason: row.deleteReason,
    });

    try {
      entity.restore();
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await this.prisma.customerNote.update({
      where: { id: row.id },
      data: {
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        updatedById: command.restoredById,
      },
    });

    return toRecord(updated);
  }
}
