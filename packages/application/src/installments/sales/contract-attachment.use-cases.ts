import { MAX_CONTRACT_ATTACHMENTS_PER_SALE } from '@hivork/domain';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { IContractAttachmentRepository } from '../../ports/contract-attachment.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { mapContractAttachmentToDto } from './contract-api.mapper.js';
import { assertSaleAccessible } from './sale-lifecycle-guards.js';
import { isSaleInScope } from './sale-data-scope.js';

export type ContractAttachmentDto = ReturnType<typeof mapContractAttachmentToDto>;

export type CreateSaleContractAttachmentInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  fileId: string;
  attachmentType: 'contract_scan' | 'signed_contract' | 'identity_doc' | 'collateral_doc' | 'other';
  label?: string;
  description?: string;
  sortOrder?: number;
  staffContext: DataScopeStaffContext;
};

const ATTACHMENT_TYPE_FROM_DTO = {
  contract_scan: 'CONTRACT_SCAN',
  signed_contract: 'SIGNED_CONTRACT',
  identity_doc: 'IDENTITY_DOC',
  collateral_doc: 'COLLATERAL_DOC',
  other: 'OTHER',
} as const;

export class CreateContractAttachmentUseCase
  implements UseCase<CreateSaleContractAttachmentInput, ContractAttachmentDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly attachments: IContractAttachmentRepository,
  ) {}

  async execute(input: CreateSaleContractAttachmentInput): Promise<ContractAttachmentDto> {
    const record = assertSaleAccessible(
      await this.sales.findById(input.tenantId, input.saleId),
      input.staffId,
      input.staffContext,
      input.branchId,
    );

    if (record.archivedAt) {
      throw new ApplicationError(
        'SALE_ARCHIVED_READONLY',
        'Archived contracts are read-only.',
        409,
      );
    }

    const existing = await this.attachments.listBySale({
      tenantId: input.tenantId,
      saleId: input.saleId,
    });

    if (existing.length >= MAX_CONTRACT_ATTACHMENTS_PER_SALE) {
      throw new ApplicationError(
        'LIMIT_EXCEEDED',
        'Maximum contract attachments per sale has been reached.',
        422,
      );
    }

    const created = await this.attachments.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      saleId: input.saleId,
      fileId: input.fileId,
      attachmentType: ATTACHMENT_TYPE_FROM_DTO[input.attachmentType],
      label: input.label ?? null,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? existing.length,
      createdById: input.staffId,
    });

    return mapContractAttachmentToDto(created);
  }
}

export type ListSaleContractAttachmentsInput = {
  tenantId: string;
  staffId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
};

export class ListContractAttachmentsUseCase
  implements UseCase<ListSaleContractAttachmentsInput, ContractAttachmentDto[]>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly attachments: IContractAttachmentRepository,
  ) {}

  async execute(input: ListSaleContractAttachmentsInput): Promise<ContractAttachmentDto[]> {
    const record = await this.sales.findById(input.tenantId, input.saleId);
    if (!record || record.deletedAt) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    if (!isSaleInScope(record, input.staffId, input.staffContext)) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    const rows = await this.attachments.listBySale({
      tenantId: input.tenantId,
      saleId: input.saleId,
    });

    return rows.map(mapContractAttachmentToDto);
  }
}

export type SoftDeleteSaleContractAttachmentInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  attachmentId: string;
  reason?: string;
  staffContext: DataScopeStaffContext;
};

export class SoftDeleteContractAttachmentUseCase
  implements UseCase<SoftDeleteSaleContractAttachmentInput, ContractAttachmentDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly attachments: IContractAttachmentRepository,
  ) {}

  async execute(input: SoftDeleteSaleContractAttachmentInput): Promise<ContractAttachmentDto> {
    assertSaleAccessible(
      await this.sales.findById(input.tenantId, input.saleId),
      input.staffId,
      input.staffContext,
      input.branchId,
    );

    const attachment = await this.attachments.findById(input.attachmentId, input.tenantId);
    if (!attachment || attachment.saleId !== input.saleId) {
      throw new ApplicationError('NOT_FOUND', 'Attachment was not found.', 404);
    }

    const deleted = await this.attachments.softDelete({
      id: attachment.id,
      tenantId: input.tenantId,
      deletedById: input.staffId,
      deleteReason: input.reason,
    });

    return mapContractAttachmentToDto(deleted);
  }
}
