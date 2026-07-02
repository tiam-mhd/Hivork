import type {
  CreateCustomerAddressesInput,
  CustomerAddressRecord,
  ICustomerAddressRepository,
  ListCustomerAddressesOptions,
  OutboxTransaction,
  RestoreCommand,
  SoftDeleteCommand,
  SyncCustomerAddressesInput,
} from '@hivork/application';
import { ApplicationError, mapDomainError } from '@hivork/application';
import { CustomerAddress } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import type { CustomerAddress as CustomerAddressRow, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

type AddressWriteClient = Pick<PrismaService, 'customerAddress'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): AddressWriteClient {
  return (tx ?? prisma) as AddressWriteClient;
}

function toRecord(row: CustomerAddressRow): CustomerAddressRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantCustomerId: row.tenantCustomerId,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    province: row.province,
    postalCode: row.postalCode,
    isPrimary: row.isPrimary,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
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
export class PrismaCustomerAddressRepository implements ICustomerAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByCustomerId(options: ListCustomerAddressesOptions): Promise<CustomerAddressRecord[]> {
    const rows = await this.prisma.customerAddress.findMany({
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
    input: CreateCustomerAddressesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerAddressRecord[]> {
    if (input.items.length === 0) {
      return [];
    }

    const entities = input.items.map((item) =>
      CustomerAddress.create({
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        label: item.label,
        line1: item.line1,
        line2: item.line2,
        city: item.city,
        province: item.province,
        postalCode: item.postalCode,
        isPrimary: item.isPrimary,
        latitude: item.latitude,
        longitude: item.longitude,
      }),
    );

    CustomerAddress.assertSinglePrimary(entities);

    const client = resolveClient(this.prisma, tx);
    const rows: CustomerAddressRow[] = [];

    for (const entity of entities) {
      const row = await client.customerAddress.create({
        data: {
          id: entity.id,
          tenantId: entity.tenantId,
          tenantCustomerId: entity.tenantCustomerId,
          label: entity.label,
          line1: entity.line1,
          line2: entity.line2,
          city: entity.city,
          province: entity.province,
          postalCode: entity.postalCode,
          isPrimary: entity.isPrimary,
          latitude: entity.latitude,
          longitude: entity.longitude,
          createdById: input.actorStaffId,
          updatedById: input.actorStaffId,
          metadata: input.items.find((item) => item.line1 === entity.line1)?.metadata as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
      rows.push(row);
    }

    return rows.map(toRecord);
  }

  async syncMany(
    input: SyncCustomerAddressesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerAddressRecord[]> {
    const client = resolveClient(this.prisma, tx);
    const existingRows = await client.customerAddress.findMany({
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
        const entity = CustomerAddress.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          label: row.label,
          line1: row.line1,
          line2: row.line2,
          city: row.city,
          province: row.province,
          postalCode: row.postalCode,
          isPrimary: row.isPrimary,
          latitude: row.latitude === null ? null : Number(row.latitude),
          longitude: row.longitude === null ? null : Number(row.longitude),
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        });
        try {
          entity.softDelete(input.actorStaffId);
        } catch (error) {
          throw mapDomainError(error);
        }
        await client.customerAddress.update({
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
          throw new ApplicationError('RECORD_NOT_FOUND', 'Address not found.', 404);
        }

        const entity = CustomerAddress.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          label: row.label,
          line1: row.line1,
          line2: row.line2,
          city: row.city,
          province: row.province,
          postalCode: row.postalCode,
          isPrimary: row.isPrimary,
          latitude: row.latitude === null ? null : Number(row.latitude),
          longitude: row.longitude === null ? null : Number(row.longitude),
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        });

        try {
          entity.update({
            label: item.label,
            line1: item.line1,
            line2: item.line2,
            city: item.city,
            province: item.province,
            postalCode: item.postalCode,
            latitude: item.latitude,
            longitude: item.longitude,
          });
          if (item.isPrimary === true) {
            entity.markPrimary();
          } else if (item.isPrimary === false) {
            entity.demotePrimary();
          }
        } catch (error) {
          throw mapDomainError(error);
        }

        await client.customerAddress.update({
          where: { id: row.id },
          data: {
            label: entity.label,
            line1: entity.line1,
            line2: entity.line2,
            city: entity.city,
            province: entity.province,
            postalCode: entity.postalCode,
            isPrimary: entity.isPrimary,
            latitude: entity.latitude,
            longitude: entity.longitude,
            ...(item.metadata !== undefined ? { metadata: item.metadata as Prisma.InputJsonValue } : {}),
            updatedById: input.actorStaffId,
            version: { increment: 1 },
          },
        });
      } else {
        const entity = CustomerAddress.create({
          tenantId: input.tenantId,
          tenantCustomerId: input.tenantCustomerId,
          label: item.label,
          line1: item.line1,
          line2: item.line2,
          city: item.city,
          province: item.province,
          postalCode: item.postalCode,
          isPrimary: item.isPrimary,
          latitude: item.latitude,
          longitude: item.longitude,
        });
        await client.customerAddress.create({
          data: {
            id: entity.id,
            tenantId: entity.tenantId,
            tenantCustomerId: entity.tenantCustomerId,
            label: entity.label,
            line1: entity.line1,
            line2: entity.line2,
            city: entity.city,
            province: entity.province,
            postalCode: entity.postalCode,
            isPrimary: entity.isPrimary,
            latitude: entity.latitude,
            longitude: entity.longitude,
            createdById: input.actorStaffId,
            updatedById: input.actorStaffId,
            metadata: item.metadata as Prisma.InputJsonValue | undefined,
          },
        });
      }
    }

    const activeRows = await client.customerAddress.findMany({
      where: {
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        deletedAt: null,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    CustomerAddress.assertSinglePrimary(
      activeRows.map((row) =>
        CustomerAddress.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          label: row.label,
          line1: row.line1,
          line2: row.line2,
          city: row.city,
          province: row.province,
          postalCode: row.postalCode,
          isPrimary: row.isPrimary,
          latitude: row.latitude === null ? null : Number(row.latitude),
          longitude: row.longitude === null ? null : Number(row.longitude),
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        }),
      ),
    );

    return activeRows.map(toRecord);
  }

  async softDelete(command: SoftDeleteCommand): Promise<CustomerAddressRecord> {
    const row = await this.prisma.customerAddress.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('RECORD_NOT_FOUND', 'Address not found.', 404);
    }

    const entity = CustomerAddress.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      tenantCustomerId: row.tenantCustomerId,
      label: row.label,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      province: row.province,
      postalCode: row.postalCode,
      isPrimary: row.isPrimary,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
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
    const updated = await this.prisma.customerAddress.update({
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

  async restore(command: RestoreCommand): Promise<CustomerAddressRecord> {
    const row = await this.prisma.customerAddress.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('RECORD_NOT_FOUND', 'Address not found.', 404);
    }

    const updated = await this.prisma.customerAddress.update({
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
