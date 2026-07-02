import { ContractCollateral } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IContractCollateralRepository } from '../../ports/contract-collateral.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  COLLATERAL_TYPE_FROM_DTO,
  mapContractCollateralToDto,
} from './contract-api.mapper.js';
import { assertSaleAccessible } from './sale-lifecycle-guards.js';
import { isSaleInScope } from './sale-data-scope.js';
import { assertSaleEditableForContractMetadata } from './sale-contract-edit.helper.js';

export type ContractCollateralDto = ReturnType<typeof mapContractCollateralToDto>;

type BaseSaleCollateralInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

function parseIssuedAt(value?: string | null): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export type ListContractCollateralsInput = BaseSaleCollateralInput;

export class ListContractCollateralsUseCase
  implements UseCase<ListContractCollateralsInput, ContractCollateralDto[]>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly collaterals: IContractCollateralRepository,
  ) {}

  async execute(input: ListContractCollateralsInput): Promise<ContractCollateralDto[]> {
    const record = await this.sales.findById(input.tenantId, input.saleId);
    if (!record || record.deletedAt) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    if (!isSaleInScope(record, input.staffId, input.staffContext)) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    const rows = await this.collaterals.listBySale({
      tenantId: input.tenantId,
      saleId: input.saleId,
    });

    return rows.map(mapContractCollateralToDto);
  }
}

export type CreateContractCollateralCommandInput = BaseSaleCollateralInput & {
  collateralType: keyof typeof COLLATERAL_TYPE_FROM_DTO;
  title: string;
  description?: string;
  estimatedValueRial: bigint;
  documentFileId?: string;
  registrationNumber?: string;
  issuedAt?: string;
  sortOrder?: number;
};

export class CreateContractCollateralUseCase
  implements UseCase<CreateContractCollateralCommandInput, ContractCollateralDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly collaterals: IContractCollateralRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateContractCollateralCommandInput): Promise<ContractCollateralDto> {
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

      const activeCount = await this.collaterals.countActiveBySale(input.tenantId, input.saleId);
      ContractCollateral.assertLimit(activeCount);

      const entity = ContractCollateral.create({
        tenantId: input.tenantId,
        saleId: input.saleId,
        collateralType: COLLATERAL_TYPE_FROM_DTO[input.collateralType],
        title: input.title,
        description: input.description ?? null,
        estimatedValueRial: input.estimatedValueRial,
        documentFileId: input.documentFileId ?? null,
        registrationNumber: input.registrationNumber ?? null,
        issuedAt: parseIssuedAt(input.issuedAt) ?? null,
        sortOrder: input.sortOrder,
        createdById: input.staffId,
      });

      const props = entity.toProps();
      const created = await this.collaterals.create({
        id: props.id,
        tenantId: props.tenantId,
        saleId: props.saleId,
        collateralType: props.collateralType,
        title: props.title,
        description: props.description,
        estimatedValueRial: props.estimatedValueRial,
        documentFileId: props.documentFileId,
        registrationNumber: props.registrationNumber,
        issuedAt: props.issuedAt,
        sortOrder: props.sortOrder,
        createdById: input.staffId,
      });

      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.staffId,
        action: 'sale.collateral.create',
        entityType: 'contract_collateral',
        entityId: created.id,
        newValue: mapContractCollateralToDto(created),
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: { saleId: input.saleId },
      });

      return mapContractCollateralToDto(created);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }
}

export type UpdateContractCollateralCommandInput = BaseSaleCollateralInput & {
  collateralId: string;
  collateralType?: keyof typeof COLLATERAL_TYPE_FROM_DTO;
  title?: string;
  description?: string | null;
  estimatedValueRial?: bigint;
  documentFileId?: string | null;
  registrationNumber?: string | null;
  issuedAt?: string | null;
  sortOrder?: number;
};

export class UpdateContractCollateralUseCase
  implements UseCase<UpdateContractCollateralCommandInput, ContractCollateralDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly collaterals: IContractCollateralRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateContractCollateralCommandInput): Promise<ContractCollateralDto> {
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

      const existing = await this.collaterals.findById(input.collateralId, input.tenantId);
      if (!existing || existing.saleId !== input.saleId) {
        throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
      }

      const entity = ContractCollateral.reconstitute(existing);
      entity.update({
        collateralType: input.collateralType
          ? COLLATERAL_TYPE_FROM_DTO[input.collateralType]
          : undefined,
        title: input.title,
        description: input.description,
        estimatedValueRial: input.estimatedValueRial,
        documentFileId: input.documentFileId,
        registrationNumber: input.registrationNumber,
        issuedAt: parseIssuedAt(input.issuedAt),
        sortOrder: input.sortOrder,
        updatedById: input.staffId,
      });

      const props = entity.toProps();
      const updated = await this.collaterals.update({
        id: existing.id,
        tenantId: input.tenantId,
        collateralType: props.collateralType,
        title: props.title,
        description: props.description,
        estimatedValueRial: props.estimatedValueRial,
        documentFileId: props.documentFileId,
        registrationNumber: props.registrationNumber,
        issuedAt: props.issuedAt,
        sortOrder: props.sortOrder,
        updatedById: input.staffId,
      });

      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.staffId,
        action: 'sale.collateral.update',
        entityType: 'contract_collateral',
        entityId: updated.id,
        oldValue: mapContractCollateralToDto(existing),
        newValue: mapContractCollateralToDto(updated),
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: { saleId: input.saleId },
      });

      return mapContractCollateralToDto(updated);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }
}

export type SoftDeleteContractCollateralCommandInput = BaseSaleCollateralInput & {
  collateralId: string;
  deleteReason?: string;
};

export class SoftDeleteContractCollateralUseCase
  implements UseCase<SoftDeleteContractCollateralCommandInput, ContractCollateralDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly collaterals: IContractCollateralRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SoftDeleteContractCollateralCommandInput): Promise<ContractCollateralDto> {
    await assertSaleEditableForContractMetadata(
      await this.sales.findById(input.tenantId, input.saleId),
      input.staffId,
      input.staffContext,
      input.branchId,
      this.installments,
      input.tenantId,
      input.saleId,
    );

    const existing = await this.collaterals.findById(input.collateralId, input.tenantId);
    if (!existing || existing.saleId !== input.saleId) {
      throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
    }

    const deleted = await this.collaterals.softDelete({
      id: existing.id,
      tenantId: input.tenantId,
      deletedById: input.staffId,
      deleteReason: input.deleteReason,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'sale.collateral.delete',
      entityType: 'contract_collateral',
      entityId: deleted.id,
      oldValue: mapContractCollateralToDto(existing),
      newValue: mapContractCollateralToDto(deleted),
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { saleId: input.saleId },
    });

    return mapContractCollateralToDto(deleted);
  }
}

export type ReleaseContractCollateralCommandInput = BaseSaleCollateralInput & {
  collateralId: string;
  reason?: string;
};

export class ReleaseContractCollateralUseCase
  implements UseCase<ReleaseContractCollateralCommandInput, ContractCollateralDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly collaterals: IContractCollateralRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ReleaseContractCollateralCommandInput): Promise<ContractCollateralDto> {
    try {
      assertSaleAccessible(
        await this.sales.findById(input.tenantId, input.saleId),
        input.staffId,
        input.staffContext,
        input.branchId,
      );

      const existing = await this.collaterals.findById(input.collateralId, input.tenantId);
      if (!existing || existing.saleId !== input.saleId) {
        throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
      }

      const entity = ContractCollateral.reconstitute(existing);
      entity.release(input.staffId);

      const updated = await this.collaterals.updateStatus({
        id: existing.id,
        tenantId: input.tenantId,
        status: 'RELEASED',
        updatedById: input.staffId,
      });

      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.staffId,
        action: 'sale.collateral.release',
        entityType: 'contract_collateral',
        entityId: updated.id,
        oldValue: mapContractCollateralToDto(existing),
        newValue: mapContractCollateralToDto(updated),
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: { saleId: input.saleId, reason: input.reason ?? null },
      });

      return mapContractCollateralToDto(updated);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }
}

export type ForfeitContractCollateralCommandInput = BaseSaleCollateralInput & {
  collateralId: string;
  reason?: string;
};

export class ForfeitContractCollateralUseCase
  implements UseCase<ForfeitContractCollateralCommandInput, ContractCollateralDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly collaterals: IContractCollateralRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ForfeitContractCollateralCommandInput): Promise<ContractCollateralDto> {
    try {
      assertSaleAccessible(
        await this.sales.findById(input.tenantId, input.saleId),
        input.staffId,
        input.staffContext,
        input.branchId,
      );

      const existing = await this.collaterals.findById(input.collateralId, input.tenantId);
      if (!existing || existing.saleId !== input.saleId) {
        throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
      }

      const entity = ContractCollateral.reconstitute(existing);
      entity.forfeit(input.staffId);

      const updated = await this.collaterals.updateStatus({
        id: existing.id,
        tenantId: input.tenantId,
        status: 'FORFEITED',
        updatedById: input.staffId,
      });

      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.staffId,
        action: 'sale.collateral.forfeit',
        entityType: 'contract_collateral',
        entityId: updated.id,
        oldValue: mapContractCollateralToDto(existing),
        newValue: mapContractCollateralToDto(updated),
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: { saleId: input.saleId, reason: input.reason ?? null },
      });

      return mapContractCollateralToDto(updated);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }
}
