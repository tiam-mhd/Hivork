import {
  ApplicationError,
  GetStaffLastLoginUseCase,
  ListStaffSecurityAuditUseCase,
} from '@hivork/application';
import { ListStaffSecurityAuditQuerySchema } from '@hivork/contracts';
import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Query,
} from '@nestjs/common';

import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequireAuth } from '../../common/decorators/require-auth.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { StaffContext } from '../../common/types/auth-context';

@Controller('v1/staff/me/security')
@RequireAuth('staff')
export class StaffSecurityController {
  constructor(
    private readonly getLastLogin: GetStaffLastLoginUseCase,
    private readonly listSecurityAudit: ListStaffSecurityAuditUseCase,
  ) {}

  @Get('last-login')
  @RequirePermission('core.security.session.view')
  async lastLogin(@CurrentStaff() staff: StaffContext) {
    try {
      return await this.getLastLogin.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get('audit-log')
  @RequirePermission('core.security.session.view')
  async auditLog(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListStaffSecurityAuditQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      return await this.listSecurityAudit.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
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
