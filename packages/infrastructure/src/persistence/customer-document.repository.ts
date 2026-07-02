import type {
  CreateCustomerDocumentInput,
  CustomerDocumentRecord,
  ICustomerDocumentRepository,
  ListCustomerDocumentsOptions,
  RestoreCommand,
  SoftDeleteCommand,
} from '@hivork/application';
import { ApplicationError, mapDomainError } from '@hivork/application';
import { CustomerDocument } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import type { CustomerDocument as CustomerDocumentRow } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: CustomerDocumentRow): CustomerDocumentRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantCustomerId: row.tenantCustomerId,
    documentType: row.documentType,
    fileStorageKey: row.fileStorageKey,
    originalFileName: row.originalFileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedById: row.uploadedById,
    description: row.description,
    expiresAt: row.expiresAt,
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
export class PrismaCustomerDocumentRepository implements ICustomerDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<CustomerDocumentRecord | null> {
    const row = await this.prisma.customerDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    return row ? toRecord(row) : null;
  }

  async listByCustomer(options: ListCustomerDocumentsOptions): Promise<CustomerDocumentRecord[]> {
    const rows = await this.prisma.customerDocument.findMany({
      where: {
        tenantId: options.tenantId,
        tenantCustomerId: options.tenantCustomerId,
        ...(options.documentType ? { documentType: options.documentType } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map(toRecord);
  }

  async create(input: CreateCustomerDocumentInput): Promise<CustomerDocumentRecord> {
    let entity: CustomerDocument;
    try {
      entity = CustomerDocument.create({
        id: input.id,
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        documentType: input.documentType,
        fileStorageKey: input.fileStorageKey,
        originalFileName: input.originalFileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedById: input.uploadedById,
        description: input.description,
        expiresAt: input.expiresAt,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const row = await this.prisma.customerDocument.create({
      data: {
        id: entity.id,
        tenantId: entity.tenantId,
        tenantCustomerId: entity.tenantCustomerId,
        documentType: entity.documentType,
        fileStorageKey: entity.fileStorageKey,
        originalFileName: entity.originalFileName,
        mimeType: entity.mimeType,
        sizeBytes: entity.sizeBytes,
        uploadedById: entity.uploadedById,
        description: entity.description,
        expiresAt: entity.expiresAt,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: input.metadata ?? undefined,
      },
    });

    return toRecord(row);
  }

  async softDelete(command: SoftDeleteCommand): Promise<CustomerDocumentRecord> {
    const row = await this.prisma.customerDocument.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('DOCUMENT_NOT_FOUND', 'Customer document was not found.', 404);
    }

    const entity = CustomerDocument.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      tenantCustomerId: row.tenantCustomerId,
      documentType: row.documentType,
      fileStorageKey: row.fileStorageKey,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedById: row.uploadedById,
      description: row.description,
      expiresAt: row.expiresAt,
      deletedAt: row.deletedAt,
      deletedById: row.deletedById,
      deleteReason: row.deleteReason,
    });

    try {
      entity.softDelete(command.deletedById, command.deleteReason);
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await this.prisma.customerDocument.update({
      where: { id: row.id },
      data: {
        deletedAt: new Date(),
        deletedById: entity.deletedById,
        deleteReason: entity.deleteReason,
        updatedById: command.deletedById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }

  async restore(command: RestoreCommand): Promise<CustomerDocumentRecord> {
    const row = await this.prisma.customerDocument.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('DOCUMENT_NOT_FOUND', 'Customer document was not found.', 404);
    }

    const updated = await this.prisma.customerDocument.update({
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
