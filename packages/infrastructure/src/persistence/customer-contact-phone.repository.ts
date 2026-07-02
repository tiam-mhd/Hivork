import type {
  CreateCustomerContactPhonesInput,
  CustomerContactPhoneRecord,
  ICustomerContactPhoneRepository,
  ListCustomerContactPhonesOptions,
  OutboxTransaction,
  RestoreCommand,
  SoftDeleteCommand,
  SyncCustomerContactPhonesInput,
  UpsertCustomerContactPhonesInput,
} from '@hivork/application';
import { ApplicationError, mapDomainError } from '@hivork/application';
import { CustomerContactPhone } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import type { CustomerContactPhone as ContactPhoneRow, Prisma } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

type ContactPhoneWriteClient = Pick<PrismaService, 'customerContactPhone'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): ContactPhoneWriteClient {
  return (tx ?? prisma) as ContactPhoneWriteClient;
}

function toRecord(row: ContactPhoneRow): CustomerContactPhoneRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantCustomerId: row.tenantCustomerId,
    phone: row.phone,
    label: row.label,
    isWhatsApp: row.isWhatsApp,
    isPrimarySecondary: row.isPrimarySecondary,
    isVerified: row.isVerified,
    notes: row.notes,
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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

@Injectable()
export class PrismaCustomerContactPhoneRepository implements ICustomerContactPhoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<CustomerContactPhoneRecord | null> {
    const row = await this.prisma.customerContactPhone.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }

  async findByPhone(tenantId: string, phone: string): Promise<CustomerContactPhoneRecord | null> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.customerContactPhone.findFirst({
        where: { tenantId, phone },
      });

      return row ? toRecord(row) : null;
    });
  }

  async listByCustomerId(
    options: ListCustomerContactPhonesOptions,
  ): Promise<CustomerContactPhoneRecord[]> {
    const rows = await this.prisma.customerContactPhone.findMany({
      where: {
        tenantId: options.tenantId,
        tenantCustomerId: options.tenantCustomerId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ isPrimarySecondary: 'desc' }, { createdAt: 'asc' }],
    });

    return rows.map(toRecord);
  }

  async createMany(
    input: CreateCustomerContactPhonesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerContactPhoneRecord[]> {
    if (input.items.length === 0) {
      return [];
    }

    const entities = input.items.map((item) =>
      CustomerContactPhone.create({
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        phone: item.phone,
        label: item.label,
        isWhatsApp: item.isWhatsApp,
        isPrimarySecondary: item.isPrimarySecondary,
        notes: item.notes,
        primaryUserPhone: input.primaryUserPhone,
      }),
    );

    CustomerContactPhone.assertNoDuplicatesWithinCustomer(entities.map((entity) => entity.phone));
    CustomerContactPhone.assertMaxCount(entities.length);
    CustomerContactPhone.assertSinglePrimarySecondary(entities);

    const client = resolveClient(this.prisma, tx);
    const rows: ContactPhoneRow[] = [];

    for (const [index, entity] of entities.entries()) {
      const existing = await this.findByPhone(input.tenantId, entity.phone);
      if (existing && !existing.deletedAt && existing.tenantCustomerId !== input.tenantCustomerId) {
        throw new ApplicationError(
          'CUSTOMER_PHONE_EXISTS',
          'Phone number is already assigned to another customer in this tenant.',
          409,
        );
      }

      try {
        const row = await client.customerContactPhone.create({
          data: {
            id: entity.id,
            tenantId: entity.tenantId,
            tenantCustomerId: entity.tenantCustomerId,
            phone: entity.phone,
            label: entity.label,
            isWhatsApp: entity.isWhatsApp,
            isPrimarySecondary: entity.isPrimarySecondary,
            isVerified: entity.isVerified,
            notes: entity.notes,
            createdById: input.actorStaffId,
            updatedById: input.actorStaffId,
            metadata: input.items[index]?.metadata as Prisma.InputJsonValue | undefined,
          },
        });
        rows.push(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApplicationError(
            'CUSTOMER_PHONE_EXISTS',
            'Phone number is already assigned to another customer in this tenant.',
            409,
          );
        }
        throw error;
      }
    }

    return rows.map(toRecord);
  }

  async syncMany(
    input: SyncCustomerContactPhonesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerContactPhoneRecord[]> {
    const client = resolveClient(this.prisma, tx);
    const existingRows = await client.customerContactPhone.findMany({
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
        const entity = CustomerContactPhone.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          phone: row.phone,
          label: row.label,
          isWhatsApp: row.isWhatsApp,
          isPrimarySecondary: row.isPrimarySecondary,
          isVerified: row.isVerified,
          notes: row.notes,
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        });
        try {
          entity.softDelete(input.actorStaffId);
        } catch (error) {
          throw mapDomainError(error);
        }
        await client.customerContactPhone.update({
          where: { id: row.id },
          data: {
            deletedAt: new Date(),
            deletedById: entity.deletedById,
            deleteReason: entity.deleteReason,
            isPrimarySecondary: false,
            updatedById: input.actorStaffId,
            version: { increment: 1 },
          },
        });
      }
    }

    const payloadPhones = input.items.map((item) => item.phone);
    CustomerContactPhone.assertNoDuplicatesWithinCustomer(payloadPhones);
    CustomerContactPhone.assertMaxCount(input.items.length);
    for (const phone of payloadPhones) {
      CustomerContactPhone.assertNotPrimaryPhone(phone, input.primaryUserPhone);
    }

    for (const item of input.items) {
      if (item.id) {
        const row = existingRows.find((existing) => existing.id === item.id);
        if (!row) {
          throw new ApplicationError('RECORD_NOT_FOUND', 'Contact phone not found.', 404);
        }

        const existing = await this.findByPhone(input.tenantId, item.phone);
        if (
          existing &&
          !existing.deletedAt &&
          existing.tenantCustomerId !== input.tenantCustomerId &&
          existing.id !== item.id
        ) {
          throw new ApplicationError(
            'CUSTOMER_PHONE_EXISTS',
            'Phone number is already assigned to another customer in this tenant.',
            409,
          );
        }

        const entity = CustomerContactPhone.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          phone: row.phone,
          label: row.label,
          isWhatsApp: row.isWhatsApp,
          isPrimarySecondary: row.isPrimarySecondary,
          isVerified: row.isVerified,
          notes: row.notes,
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        });

        try {
          entity.update({
            phone: item.phone,
            label: item.label,
            isWhatsApp: item.isWhatsApp,
            isPrimarySecondary: item.isPrimarySecondary,
            notes: item.notes,
            primaryUserPhone: input.primaryUserPhone,
          });
        } catch (error) {
          throw mapDomainError(error);
        }

        try {
          await client.customerContactPhone.update({
            where: { id: row.id },
            data: {
              phone: entity.phone,
              label: entity.label,
              isWhatsApp: entity.isWhatsApp,
              isPrimarySecondary: entity.isPrimarySecondary,
              notes: entity.notes,
              ...(item.metadata !== undefined ? { metadata: item.metadata as Prisma.InputJsonValue } : {}),
              updatedById: input.actorStaffId,
              version: { increment: 1 },
            },
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ApplicationError(
              'CUSTOMER_PHONE_EXISTS',
              'Phone number is already assigned to another customer in this tenant.',
              409,
            );
          }
          throw error;
        }
      } else {
        const entity = CustomerContactPhone.create({
          tenantId: input.tenantId,
          tenantCustomerId: input.tenantCustomerId,
          phone: item.phone,
          label: item.label,
          isWhatsApp: item.isWhatsApp,
          isPrimarySecondary: item.isPrimarySecondary,
          notes: item.notes,
          primaryUserPhone: input.primaryUserPhone,
        });

        const existing = await this.findByPhone(input.tenantId, entity.phone);
        if (existing && !existing.deletedAt && existing.tenantCustomerId !== input.tenantCustomerId) {
          throw new ApplicationError(
            'CUSTOMER_PHONE_EXISTS',
            'Phone number is already assigned to another customer in this tenant.',
            409,
          );
        }

        try {
          await client.customerContactPhone.create({
            data: {
              id: entity.id,
              tenantId: entity.tenantId,
              tenantCustomerId: entity.tenantCustomerId,
              phone: entity.phone,
              label: entity.label,
              isWhatsApp: entity.isWhatsApp,
              isPrimarySecondary: entity.isPrimarySecondary,
              isVerified: entity.isVerified,
              notes: entity.notes,
              createdById: input.actorStaffId,
              updatedById: input.actorStaffId,
              metadata: item.metadata as Prisma.InputJsonValue | undefined,
            },
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ApplicationError(
              'CUSTOMER_PHONE_EXISTS',
              'Phone number is already assigned to another customer in this tenant.',
              409,
            );
          }
          throw error;
        }
      }
    }

    const activeRows = await client.customerContactPhone.findMany({
      where: {
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        deletedAt: null,
      },
      orderBy: [{ isPrimarySecondary: 'desc' }, { createdAt: 'asc' }],
    });

    CustomerContactPhone.assertSinglePrimarySecondary(
      activeRows.map((row) =>
        CustomerContactPhone.reconstitute({
          id: row.id,
          tenantId: row.tenantId,
          tenantCustomerId: row.tenantCustomerId,
          phone: row.phone,
          label: row.label,
          isWhatsApp: row.isWhatsApp,
          isPrimarySecondary: row.isPrimarySecondary,
          isVerified: row.isVerified,
          notes: row.notes,
          deletedAt: row.deletedAt,
          deletedById: row.deletedById,
          deleteReason: row.deleteReason,
        }),
      ),
    );

    return activeRows.map(toRecord);
  }

  async upsertMany(_input: UpsertCustomerContactPhonesInput): Promise<CustomerContactPhoneRecord[]> {
    throw new ApplicationError('NOT_IMPLEMENTED', 'Contact phone upsert is not implemented yet.', 501);
  }

  async softDelete(command: SoftDeleteCommand): Promise<CustomerContactPhoneRecord> {
    const row = await this.prisma.customerContactPhone.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('RECORD_NOT_FOUND', 'Contact phone not found.', 404);
    }

    const entity = CustomerContactPhone.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      tenantCustomerId: row.tenantCustomerId,
      phone: row.phone,
      label: row.label,
      isWhatsApp: row.isWhatsApp,
      isPrimarySecondary: row.isPrimarySecondary,
      isVerified: row.isVerified,
      notes: row.notes,
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
    const updated = await this.prisma.customerContactPhone.update({
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

  async restore(command: RestoreCommand): Promise<CustomerContactPhoneRecord> {
    const row = await this.prisma.customerContactPhone.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('RECORD_NOT_FOUND', 'Contact phone not found.', 404);
    }

    const updated = await this.prisma.customerContactPhone.update({
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
