import { ContractGuarantor, MAX_CONTRACT_GUARANTORS_PER_SALE } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IContractGuarantorRepository } from '../../ports/contract-guarantor.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  GUARANTOR_RELATIONSHIP_FROM_DTO,
  mapContractGuarantorToDto,
} from './contract-api.mapper.js';
import { isSaleInScope } from './sale-data-scope.js';
import { assertSaleEditableForContractMetadata } from './sale-contract-edit.helper.js';

export type ContractGuarantorDto = ReturnType<typeof mapContractGuarantorToDto>;

type BaseSaleGuarantorInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type ListContractGuarantorsInput = BaseSaleGuarantorInput;

export class ListContractGuarantorsUseCase
  implements UseCase<ListContractGuarantorsInput, ContractGuarantorDto[]>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly guarantors: IContractGuarantorRepository,
  ) {}

  async execute(input: ListContractGuarantorsInput): Promise<ContractGuarantorDto[]> {
    const record = await this.sales.findById(input.tenantId, input.saleId);
    if (!record || record.deletedAt) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    if (!isSaleInScope(record, input.staffId, input.staffContext)) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    const rows = await this.guarantors.listBySale({
      tenantId: input.tenantId,
      saleId: input.saleId,
    });

    return rows.map(mapContractGuarantorToDto);
  }
}

export type CreateContractGuarantorCommandInput = BaseSaleGuarantorInput & {
  tenantCustomerId?: string;
  fullName?: string;
  nationalId?: string;
  phone?: string;
  relationship: keyof typeof GUARANTOR_RELATIONSHIP_FROM_DTO;
  note?: string;
  sortOrder?: number;
};

export class CreateContractGuarantorUseCase
  implements UseCase<CreateContractGuarantorCommandInput, ContractGuarantorDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly guarantors: IContractGuarantorRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateContractGuarantorCommandInput): Promise<ContractGuarantorDto> {
    try {
      await assertSaleEditableForContractMetadata(
        await this.sales.findById(input.tenantId, input.saleId),
        input.staffId,
        input.staffContext,
        input.branchId,
        this.installments,
        input.tenantId,
        input.saleId,
      );

      const activeCount = await this.guarantors.countActiveBySale(input.tenantId, input.saleId);
      ContractGuarantor.assertLimit(activeCount);

      const entity = ContractGuarantor.create({
        tenantId: input.tenantId,
        saleId: input.saleId,
        tenantCustomerId: input.tenantCustomerId ?? null,
        fullName: input.fullName ?? null,
        nationalId: input.nationalId ?? null,
        phone: input.phone ?? null,
        relationship: GUARANTOR_RELATIONSHIP_FROM_DTO[input.relationship],
        note: input.note ?? null,
        sortOrder: input.sortOrder,
        createdById: input.staffId,
      });

      const props = entity.toProps();
      const created = await this.guarantors.create({
        id: props.id,
        tenantId: props.tenantId,
        saleId: props.saleId,
        tenantCustomerId: props.tenantCustomerId,
        fullName: props.fullName,
        nationalId: props.nationalId,
        phone: props.phone,
        relationship: props.relationship,
        note: props.note,
        sortOrder: props.sortOrder,
        createdById: input.staffId,
      });

      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.staffId,
        action: 'sale.guarantor.create',
        entityType: 'contract_guarantor',
        entityId: created.id,
        newValue: mapContractGuarantorToDto(created),
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: { saleId: input.saleId },
      });

      return mapContractGuarantorToDto(created);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }
}

export type UpdateContractGuarantorCommandInput = BaseSaleGuarantorInput & {
  guarantorId: string;
  tenantCustomerId?: string | null;
  fullName?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  relationship?: keyof typeof GUARANTOR_RELATIONSHIP_FROM_DTO;
  note?: string | null;
  sortOrder?: number;
};

export class UpdateContractGuarantorUseCase
  implements UseCase<UpdateContractGuarantorCommandInput, ContractGuarantorDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly guarantors: IContractGuarantorRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateContractGuarantorCommandInput): Promise<ContractGuarantorDto> {
    try {
      await assertSaleEditableForContractMetadata(
        await this.sales.findById(input.tenantId, input.saleId),
        input.staffId,
        input.staffContext,
        input.branchId,
        this.installments,
        input.tenantId,
        input.saleId,
      );

      const existing = await this.guarantors.findById(input.guarantorId, input.tenantId);
      if (!existing || existing.saleId !== input.saleId) {
        throw new ApplicationError('GUARANTOR_NOT_FOUND', 'Contract guarantor was not found.', 404);
      }

      const entity = ContractGuarantor.reconstitute(existing);
      entity.update({
        tenantCustomerId: input.tenantCustomerId,
        fullName: input.fullName,
        nationalId: input.nationalId,
        phone: input.phone,
        relationship: input.relationship
          ? GUARANTOR_RELATIONSHIP_FROM_DTO[input.relationship]
          : undefined,
        note: input.note,
        sortOrder: input.sortOrder,
        updatedById: input.staffId,
      });

      const props = entity.toProps();
      const updated = await this.guarantors.update({
        id: existing.id,
        tenantId: input.tenantId,
        tenantCustomerId: props.tenantCustomerId,
        fullName: props.fullName,
        nationalId: props.nationalId,
        phone: props.phone,
        relationship: props.relationship,
        note: props.note,
        sortOrder: props.sortOrder,
        updatedById: input.staffId,
      });

      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.staffId,
        action: 'sale.guarantor.update',
        entityType: 'contract_guarantor',
        entityId: updated.id,
        oldValue: mapContractGuarantorToDto(existing),
        newValue: mapContractGuarantorToDto(updated),
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: { saleId: input.saleId },
      });

      return mapContractGuarantorToDto(updated);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }
}

export type SoftDeleteContractGuarantorCommandInput = BaseSaleGuarantorInput & {
  guarantorId: string;
  deleteReason?: string;
};

export class SoftDeleteContractGuarantorUseCase
  implements UseCase<SoftDeleteContractGuarantorCommandInput, ContractGuarantorDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly guarantors: IContractGuarantorRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SoftDeleteContractGuarantorCommandInput): Promise<ContractGuarantorDto> {
    await assertSaleEditableForContractMetadata(
      await this.sales.findById(input.tenantId, input.saleId),
      input.staffId,
      input.staffContext,
      input.branchId,
      this.installments,
      input.tenantId,
      input.saleId,
    );

    const existing = await this.guarantors.findById(input.guarantorId, input.tenantId);
    if (!existing || existing.saleId !== input.saleId) {
      throw new ApplicationError('GUARANTOR_NOT_FOUND', 'Contract guarantor was not found.', 404);
    }

    const deleted = await this.guarantors.softDelete({
      id: existing.id,
      tenantId: input.tenantId,
      deletedById: input.staffId,
      deleteReason: input.deleteReason,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'sale.guarantor.delete',
      entityType: 'contract_guarantor',
      entityId: deleted.id,
      oldValue: mapContractGuarantorToDto(existing),
      newValue: mapContractGuarantorToDto(deleted),
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { saleId: input.saleId },
    });

    return mapContractGuarantorToDto(deleted);
  }
}

export type RestoreContractGuarantorCommandInput = BaseSaleGuarantorInput & {
  guarantorId: string;
};

export class RestoreContractGuarantorUseCase
  implements UseCase<RestoreContractGuarantorCommandInput, ContractGuarantorDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly guarantors: IContractGuarantorRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RestoreContractGuarantorCommandInput): Promise<ContractGuarantorDto> {
    await assertSaleEditableForContractMetadata(
      await this.sales.findById(input.tenantId, input.saleId),
      input.staffId,
      input.staffContext,
      input.branchId,
      this.installments,
      input.tenantId,
      input.saleId,
    );

    const activeCount = await this.guarantors.countActiveBySale(input.tenantId, input.saleId);
    if (activeCount >= MAX_CONTRACT_GUARANTORS_PER_SALE) {
      throw new ApplicationError(
        'GUARANTOR_LIMIT_EXCEEDED',
        'Maximum guarantors per sale has been reached.',
        409,
      );
    }

    const restored = await this.guarantors.restore({
      id: input.guarantorId,
      tenantId: input.tenantId,
      restoredById: input.staffId,
    });

    if (restored.saleId !== input.saleId) {
      throw new ApplicationError('GUARANTOR_NOT_FOUND', 'Contract guarantor was not found.', 404);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'sale.guarantor.update',
      entityType: 'contract_guarantor',
      entityId: restored.id,
      newValue: mapContractGuarantorToDto(restored),
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { saleId: input.saleId, restored: true },
    });

    return mapContractGuarantorToDto(restored);
  }
}
