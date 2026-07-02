import type {
  ITenantCustomerMergeRepository,
  OutboxTransaction,
  ReassignCustomerRelatedRecordsInput,
  ReassignCustomerRelatedRecordsResult,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): PrismaService {
  return (tx ?? prisma) as PrismaService;
}

@Injectable()
export class PrismaTenantCustomerMergeRepository implements ITenantCustomerMergeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async reassignRelatedRecords(
    input: ReassignCustomerRelatedRecordsInput,
    tx?: OutboxTransaction,
  ): Promise<ReassignCustomerRelatedRecordsResult> {
    const client = resolveClient(this.prisma, tx);

    const targetHasPrimaryAddress = await client.customerAddress.findFirst({
      where: {
        tenantId: input.tenantId,
        tenantCustomerId: input.targetTenantCustomerId,
        deletedAt: null,
        isPrimary: true,
      },
      select: { id: true },
    });

    if (targetHasPrimaryAddress) {
      await client.customerAddress.updateMany({
        where: {
          tenantId: input.tenantId,
          tenantCustomerId: input.sourceTenantCustomerId,
          deletedAt: null,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
          updatedById: input.updatedById,
        },
      });
    }

    const [documents, notes, addresses, contactPhones, emergencyContacts] =
      await Promise.all([
        client.customerDocument.updateMany({
          where: {
            tenantId: input.tenantId,
            tenantCustomerId: input.sourceTenantCustomerId,
            deletedAt: null,
          },
          data: {
            tenantCustomerId: input.targetTenantCustomerId,
            updatedById: input.updatedById,
          },
        }),
        client.customerNote.updateMany({
          where: {
            tenantId: input.tenantId,
            tenantCustomerId: input.sourceTenantCustomerId,
            deletedAt: null,
          },
          data: {
            tenantCustomerId: input.targetTenantCustomerId,
            updatedById: input.updatedById,
          },
        }),
        client.customerAddress.updateMany({
          where: {
            tenantId: input.tenantId,
            tenantCustomerId: input.sourceTenantCustomerId,
            deletedAt: null,
          },
          data: {
            tenantCustomerId: input.targetTenantCustomerId,
            updatedById: input.updatedById,
          },
        }),
        client.customerContactPhone.updateMany({
          where: {
            tenantId: input.tenantId,
            tenantCustomerId: input.sourceTenantCustomerId,
            deletedAt: null,
          },
          data: {
            tenantCustomerId: input.targetTenantCustomerId,
            updatedById: input.updatedById,
          },
        }),
        client.customerEmergencyContact.updateMany({
          where: {
            tenantId: input.tenantId,
            tenantCustomerId: input.sourceTenantCustomerId,
            deletedAt: null,
          },
          data: {
            tenantCustomerId: input.targetTenantCustomerId,
            updatedById: input.updatedById,
          },
        }),
      ]);

    return {
      documentsCount: documents.count,
      notesCount: notes.count,
      addressesCount: addresses.count,
      contactPhonesCount: contactPhones.count,
      emergencyContactsCount: emergencyContacts.count,
    };
  }
}
