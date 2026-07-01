import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IUserMfaPort } from './ports/user-mfa.port.js';
import type { IUserMfaTotpRepository } from './ports/user-mfa-totp.repository.port.js';

export type GetStaffMfaStatusInput = {
  staffId: string;
  tenantId: string;
};

export type GetStaffMfaStatusOutput = {
  totpEnabled: boolean;
  otpStepUpEnabled: boolean;
  backupCodesRemaining: number;
};

export class GetStaffMfaStatusUseCase
  implements UseCase<GetStaffMfaStatusInput, GetStaffMfaStatusOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly userMfa: IUserMfaPort,
    private readonly totpRepository: IUserMfaTotpRepository,
  ) {}

  async execute(input: GetStaffMfaStatusInput): Promise<GetStaffMfaStatusOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    const stepUp = await this.userMfa.getLoginStepUp(staff.userId);
    const totpRecord = await this.totpRepository.findEnabledByUserId(staff.userId);
    const backupCodesRemaining =
      totpRecord?.backupCodesHash?.filter((entry) => entry.usedAt === null).length ?? 0;

    return {
      totpEnabled: stepUp.totpEnabled,
      otpStepUpEnabled: stepUp.otpEnabled,
      backupCodesRemaining,
    };
  }
}
