import type {
  CreateCustomerEmergencyContactsInput,
  CustomerEmergencyContactRecord,
  ICustomerEmergencyContactRepository,
  ListCustomerEmergencyContactsOptions,
  OutboxTransaction,
  RestoreCommand,
  SoftDeleteCommand,
  SyncCustomerEmergencyContactsInput,
} from '@hivork/application';
import { ApplicationError, mapDomainError } from '@hivork/application';
import { CustomerEmergencyContact } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import type { CustomerEmergencyContact as EmergencyContactRow, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

type EmergencyContactWriteClient = Pick<PrismaService, 'customerEmergencyContact'>;

function resolveClient(
  prisma: PrismaService,
  tx?: OutboxTransaction,
): EmergencyContactWriteClient {
  return (tx ?? prisma) as EmergencyContactWriteClient;
}

function toRecord(row: EmergencyContactRow): CustomerEmergencyContactRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantCustomerId: row.tenantCustomerId,
    name: row.name,
    phone: row.phone,
    relation: row.relation,
    isPrimary: row.isPrimary,
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

@Injectable()
export class PrismaCustomerEmergencyContactRepository
  implements ICustomerEmergencyContactRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async listByCustomerId(
    options: ListCustomerEmergencyContactsOptions,
  ): Promise<CustomerEmergencyContactRecord[]> {
    const rows = await this.prisma.customerEmergencyContact.findMany({
      where: {
        tenantId: options.tenantId,
        tenantCustomerId: options.tenantCustomerId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return rows.map(toRecord);
  }

  async createMany(
    input: CreateCustomerEmergencyContactsInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerEmergencyContactRecord[]> {
    if (input.items.length === 0) {
      return [];
    }

    const entities = input.items.map((item) =>
      CustomerEmergencyContact.create({
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        name: item.name,
        phone: item.phone,
        relation: item.relation,
        isPrimary: item.isPrimary,
      }),
    );

    CustomerEmergencyContact.assertSinglePrimary(entities);

    const client = resolveClient(this.prisma, tx);
    const rows: EmergencyContactRow[] = [];

    for (const entity of entities) {
      const row = await client.customerEmergencyContact.create({
        data: {
          id: entity.id,
          tenantId: entity.tenantId,
          tenantCustomerId: entity.tenantCustomerId,
          name: entity.name,
          phone: entity.phone,
          relation: entity.relation,
          isPrimary: entity.isPrimary,
          createdById: input.actorStaffId,
          updatedById: input.actorStaffId,
          metadata: input.items.find((item) => item.phone === entity.phone)?.metadata as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
      rows.push(row);
    }

    return rows.map(toRecord);
  }

  async syncMany(
    input: SyncCustomerEmergencyContactsInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerEmergencyContactRecord[]> {
    const client = resolveClient(this.prisma, tx);
    const existingRows = await client.customerEmergencyContact.findMany({
      where: {
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        deletedAt: null,
      },
    });

    const referencedIds = new Set(
      input.items.filter((item) => item.id !== undefined).map((item) => item.id as string),
    );

    for (const row of existingRows) {
      if (!referencedIds.has(row.id)) {
        const entity = CustomerEmergencyContact.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          name: row.name,
          phone: row.phone,
          relation: row.relation,
          isPrimary: row.isPrimary,
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        });
        try {
          entity.softDelete(input.actorStaffId);
        } catch (error) {
          throw mapDomainError(error);
        }
        await client.customerEmergencyContact.update({
          where: { id: row.id },
          data: {
            deletedAt: new Date(),
            deletedById: entity.deletedById,
            deleteReason: entity.deleteReason,
            isPrimary: false,
            updatedById: input.actorStaffId,
            version: { increment: 1 },
          },
        });
      }
    }

    for (const item of input.items) {
      if (item.id) {
        const row = existingRows.find((existing) => existing.id === item.id);
        if (!row) {
          throw new ApplicationError('RECORD_NOT_FOUND', 'Emergency contact not found.', 404);
        }

        const entity = CustomerEmergencyContact.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          name: row.name,
          phone: row.phone,
          relation: row.relation,
          isPrimary: row.isPrimary,
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        });

        try {
          entity.update({
            name: item.name,
            phone: item.phone,
            relation: item.relation,
          });
          if (item.isPrimary === true) {
            entity.markPrimary();
          } else if (item.isPrimary === false) {
            entity.demotePrimary();
          }
        } catch (error) {
          throw mapDomainError(error);
        }

        await client.customerEmergencyContact.update({
          where: { id: row.id },
          data: {
            name: entity.name,
            phone: entity.phone,
            relation: entity.relation,
            isPrimary: entity.isPrimary,
            ...(item.metadata !== undefined ? { metadata: item.metadata as Prisma.InputJsonValue } : {}),
            updatedById: input.actorStaffId,
            version: { increment: 1 },
          },
        });
      } else {
        const entity = CustomerEmergencyContact.create({
          tenantId: input.tenantId,
          tenantCustomerId: input.tenantCustomerId,
          name: item.name,
          phone: item.phone,
          relation: item.relation,
          isPrimary: item.isPrimary,
        });
        await client.customerEmergencyContact.create({
          data: {
            id: entity.id,
            tenantId: entity.tenantId,
            tenantCustomerId: entity.tenantCustomerId,
            name: entity.name,
            phone: entity.phone,
            relation: entity.relation,
            isPrimary: entity.isPrimary,
            createdById: input.actorStaffId,
            updatedById: input.actorStaffId,
            metadata: item.metadata as Prisma.InputJsonValue | undefined,
          },
        });
      }
    }

    const activeRows = await client.customerEmergencyContact.findMany({
      where: {
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        deletedAt: null,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    CustomerEmergencyContact.assertSinglePrimary(
      activeRows.map((row) =>
        CustomerEmergencyContact.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          name: row.name,
          phone: row.phone,
          relation: row.relation,
          isPrimary: row.isPrimary,
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        }),
      ),
    );

    return activeRows.map(toRecord);
  }

  async softDelete(command: SoftDeleteCommand): Promise<CustomerEmergencyContactRecord> {
    const row = await this.prisma.customerEmergencyContact.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('RECORD_NOT_FOUND', 'Emergency contact not found.', 404);
    }

    const entity = CustomerEmergencyContact.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      tenantCustomerId: row.tenantCustomerId,
      name: row.name,
      phone: row.phone,
      relation: row.relation,
      isPrimary: row.isPrimary,
      deletedAt: row.deletedAt,
      deletedById: row.deletedById,
      deleteReason: row.deleteReason,
    });

    try {
      entity.softDelete(command.deletedById, command.deleteReason);
    } catch (error) {
      throw mapDomainError(error);
    }

    const deletedAt = new Date();
    const updated = await this.prisma.customerEmergencyContact.update({
      where: { id: row.id },
      data: {
        deletedAt,
        deletedById: entity.deletedById,
        deleteReason: entity.deleteReason,
        updatedById: command.deletedById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }

  async restore(command: RestoreCommand): Promise<CustomerEmergencyContactRecord> {
    const row = await this.prisma.customerEmergencyContact.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('RECORD_NOT_FOUND', 'Emergency contact not found.', 404);
    }

    const updated = await this.prisma.customerEmergencyContact.update({
      where: { id: row.id },
      data: {
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        updatedById: command.restoredById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }
}
