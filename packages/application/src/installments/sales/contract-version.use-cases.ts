import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { IContractVersionRepository } from '../../ports/contract-version.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  mapContractVersionDetailToDto,
  mapContractVersionToDto,
} from './contract-api.mapper.js';
import { isSaleInScope } from './sale-data-scope.js';

export type ContractVersionDto = ReturnType<typeof mapContractVersionToDto>;
export type ContractVersionDetailDto = ReturnType<typeof mapContractVersionDetailToDto>;

export type ListContractVersionsInput = {
  tenantId: string;
  staffId: string;
  saleId: string;
  limit: number;
  staffContext: DataScopeStaffContext;
};

export class ListContractVersionsUseCase
  implements UseCase<ListContractVersionsInput, ContractVersionDto[]>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly contractVersions: IContractVersionRepository,
  ) {}

  async execute(input: ListContractVersionsInput): Promise<ContractVersionDto[]> {
    await this.assertSaleVisible(input);

    const rows = await this.contractVersions.listBySale(input.tenantId, input.saleId);
    return rows.slice(0, input.limit).map(mapContractVersionToDto);
  }

  private async assertSaleVisible(input: ListContractVersionsInput): Promise<void> {
    const record = await this.sales.findById(input.tenantId, input.saleId);
    if (!record || record.deletedAt) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    if (!isSaleInScope(record, input.staffId, input.staffContext)) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }
  }
}

export type GetContractVersionInput = {
  tenantId: string;
  staffId: string;
  saleId: string;
  versionNumber: number;
  staffContext: DataScopeStaffContext;
};

export class GetContractVersionUseCase
  implements UseCase<GetContractVersionInput, ContractVersionDetailDto>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly contractVersions: IContractVersionRepository,
  ) {}

  async execute(input: GetContractVersionInput): Promise<ContractVersionDetailDto> {
    const record = await this.sales.findById(input.tenantId, input.saleId);
    if (!record || record.deletedAt) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    if (!isSaleInScope(record, input.staffId, input.staffContext)) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    const version = await this.contractVersions.findByVersionNumber(
      input.tenantId,
      input.saleId,
      input.versionNumber,
    );

    if (!version) {
      throw new ApplicationError('NOT_FOUND', 'Contract version was not found.', 404);
    }

    return mapContractVersionDetailToDto(version);
  }
}
