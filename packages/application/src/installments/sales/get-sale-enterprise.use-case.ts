import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { IContractAttachmentRepository } from '../../ports/contract-attachment.repository.port.js';
import type { IContractVersionRepository } from '../../ports/contract-version.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  mapContractAttachmentToDto,
  mapContractVersionToDto,
} from './contract-api.mapper.js';
import { isSaleInScope } from './sale-data-scope.js';
import {
  mapSaleToEnterpriseDetail,
  type SaleDetailEnterprise,
} from './sale-enterprise.mapper.js';

export type GetSaleEnterpriseInput = {
  tenantId: string;
  actorId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
  includeVersions?: boolean;
  includeAttachments?: boolean;
};

export type GetSaleEnterpriseOutput = SaleDetailEnterprise & {
  customer?: { id: string; phone: string; name: string | null };
  versions?: ReturnType<typeof mapContractVersionToDto>[];
  attachments?: ReturnType<typeof mapContractAttachmentToDto>[];
};

export class GetSaleEnterpriseUseCase
  implements UseCase<GetSaleEnterpriseInput, GetSaleEnterpriseOutput>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly contractVersions: IContractVersionRepository,
    private readonly contractAttachments: IContractAttachmentRepository,
  ) {}

  async execute(input: GetSaleEnterpriseInput): Promise<GetSaleEnterpriseOutput> {
    const detail = await this.sales.findDetailById(input.tenantId, input.saleId);

    if (!detail || detail.sale.deletedAt) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    if (!isSaleInScope(detail.sale, input.actorId, input.staffContext)) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    const installmentRows = await this.installments.findBySaleId(input.tenantId, input.saleId);
    const sortedInstallments = [...installmentRows].sort(
      (left, right) => left.sequenceNumber - right.sequenceNumber,
    );

    const base = mapSaleToEnterpriseDetail(
      detail.sale,
      sortedInstallments,
      detail.customer,
    );

    const versions = input.includeVersions
      ? (await this.contractVersions.listBySale(input.tenantId, input.saleId)).map(
          mapContractVersionToDto,
        )
      : undefined;

    const attachments = input.includeAttachments
      ? (
          await this.contractAttachments.listBySale({
            tenantId: input.tenantId,
            saleId: input.saleId,
          })
        ).map(mapContractAttachmentToDto)
      : undefined;

    return {
      ...base,
      customer: detail.customer,
      ...(versions ? { versions } : {}),
      ...(attachments ? { attachments } : {}),
    };
  }
}
