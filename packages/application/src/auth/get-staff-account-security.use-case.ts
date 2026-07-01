import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IUserCredentialRepository } from '../ports/user-credential.repository.port.js';

export type GetStaffAccountSecurityInput = {
  staffId: string;
  tenantId: string;
};

export type GetStaffAccountSecurityOutput = {
  mustChangePassword: boolean;
};

export class GetStaffAccountSecurityUseCase
  implements UseCase<GetStaffAccountSecurityInput, GetStaffAccountSecurityOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly credentialRepository: IUserCredentialRepository,
  ) {}

  async execute(input: GetStaffAccountSecurityInput): Promise<GetStaffAccountSecurityOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    const credential = await this.credentialRepository.findByUserId(staff.userId);
    if (!credential) {
      return { mustChangePassword: false };
    }

    return {
      mustChangePassword:
        credential.mustChangePassword || credential.status === 'must_change_password',
    };
  }
}
