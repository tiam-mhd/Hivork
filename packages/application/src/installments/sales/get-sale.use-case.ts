import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from './sale-data-scope.js';
import { mapSaleDetailRecord, type SaleDetail } from './sale-summary.mapper.js';
import type { SaleCustomerEmbed } from '../../ports/sale.repository.port.js';

export type GetSaleInput = {
  tenantId: string;
  actorId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
};

export type GetSaleOutput = SaleDetail & { customer: SaleCustomerEmbed };

export class GetSaleUseCase implements UseCase<GetSaleInput, GetSaleOutput> {
  constructor(
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
  ) {}

  async execute(input: GetSaleInput): Promise<GetSaleOutput> {
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

    return mapSaleDetailRecord(detail, sortedInstallments);
  }
}
