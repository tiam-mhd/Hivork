import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import type { EnterpriseSaleStatusDto } from './contract-api.mapper.js';
import { ArchiveContractUseCase } from './archive-contract.use-case.js';
import { CloseContractUseCase } from './close-contract.use-case.js';
import { TerminateContractUseCase } from './terminate-contract.use-case.js';
import type { SaleDetailEnterprise } from './sale-enterprise.mapper.js';
import { assertReasonProvided } from './sale-lifecycle-guards.js';

export type ChangeSaleStatusInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  targetStatus: EnterpriseSaleStatusDto;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export class ChangeSaleStatusUseCase implements UseCase<ChangeSaleStatusInput, SaleDetailEnterprise> {
  constructor(
    private readonly terminate: TerminateContractUseCase,
    private readonly close: CloseContractUseCase,
    private readonly archive: ArchiveContractUseCase,
  ) {}

  async execute(input: ChangeSaleStatusInput): Promise<SaleDetailEnterprise> {
    assertReasonProvided(input.reason, 'Status change reason');

    switch (input.targetStatus) {
      case 'terminated':
        return this.terminate.execute({
          tenantId: input.tenantId,
          staffId: input.staffId,
          branchId: input.branchId,
          saleId: input.saleId,
          reason: input.reason,
          staffContext: input.staffContext,
          ip: input.ip,
          userAgent: input.userAgent,
        });
      case 'closed':
        return this.close.execute({
          tenantId: input.tenantId,
          staffId: input.staffId,
          branchId: input.branchId,
          saleId: input.saleId,
          reason: input.reason,
          waiveRemaining: false,
          staffContext: input.staffContext,
          ip: input.ip,
          userAgent: input.userAgent,
        });
      case 'archived':
        return this.archive.execute({
          tenantId: input.tenantId,
          staffId: input.staffId,
          branchId: input.branchId,
          saleId: input.saleId,
          reason: input.reason,
          staffContext: input.staffContext,
          ip: input.ip,
          userAgent: input.userAgent,
        });
      default:
        throw new ApplicationError(
          'INVALID_STATUS_TRANSITION',
          'Target status cannot be applied via change-status.',
          409,
        );
    }
  }
}
