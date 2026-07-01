import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { toLoginSnapshot } from './login-snapshot.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { LoginSnapshot } from './login-snapshot.js';

export type GetStaffLastLoginInput = {
  staffId: string;
  tenantId: string;
};

export type GetStaffLastLoginOutput = {
  current: LoginSnapshot | null;
  previous: LoginSnapshot | null;
};

export class GetStaffLastLoginUseCase
  implements UseCase<GetStaffLastLoginInput, GetStaffLastLoginOutput>
{
  constructor(private readonly staffRepository: IStaffRepository) {}

  async execute(input: GetStaffLastLoginInput): Promise<GetStaffLastLoginOutput> {
    const display = await this.staffRepository.getStaffLoginDisplay(
      input.staffId,
      input.tenantId,
    );

    if (!display) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    return {
      current: toLoginSnapshot(
        display.lastLoginAt,
        display.lastLoginIp,
        display.lastLoginDeviceLabel,
      ),
      previous: toLoginSnapshot(
        display.previousLoginAt,
        display.previousLoginIp,
        display.previousLoginDeviceLabel,
      ),
    };
  }
}
