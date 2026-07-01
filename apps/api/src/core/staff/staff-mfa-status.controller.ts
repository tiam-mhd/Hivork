import { ApplicationError, GetStaffMfaStatusUseCase } from '@hivork/application';
import { Controller, Get, HttpException } from '@nestjs/common';

import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import type { StaffContext } from '../../common/types/auth-context.js';

@Controller('v1/staff/me/mfa')
@RequireAuth('staff')
export class StaffMfaStatusController {
  constructor(private readonly getMfaStatus: GetStaffMfaStatusUseCase) {}

  @Get('status')
  async status(@CurrentStaff() staff: StaffContext) {
    try {
      return await this.getMfaStatus.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof ApplicationError) {
      return new HttpException(
        { code: error.code, message: error.message, details: error.details },
        error.httpStatus,
      );
    }

    throw error;
  }
}
