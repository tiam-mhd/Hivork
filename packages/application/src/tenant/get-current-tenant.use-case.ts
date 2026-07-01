import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ITenantRepository, TenantDetailRecord } from '../ports/tenant.repository.port.js';

export type GetCurrentTenantInput = {
  tenantId: string;
};

export type GetCurrentTenantOutput = {
  tenant: TenantDetailRecord;
  staffId: string;
  activeBranchId: string | null;
};

export class GetCurrentTenantUseCase
  implements UseCase<GetCurrentTenantInput & { staffId: string; activeBranchId: string | null }, GetCurrentTenantOutput>
{
  constructor(private readonly tenants: ITenantRepository) {}

  async execute(
    input: GetCurrentTenantInput & { staffId: string; activeBranchId: string | null },
  ): Promise<GetCurrentTenantOutput> {
    const tenant = await this.tenants.findDetailById(input.tenantId);
    if (!tenant) {
      throw new ApplicationError('NOT_FOUND', 'Tenant not found.', 404);
    }

    return {
      tenant,
      staffId: input.staffId,
      activeBranchId: input.activeBranchId,
    };
  }
}
