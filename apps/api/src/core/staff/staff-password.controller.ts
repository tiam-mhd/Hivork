import {
  ApplicationError,
  ChangeStaffPasswordUseCase,
  GetStaffAccountSecurityUseCase,
} from '@hivork/application';
import { ChangeStaffPasswordSchema } from '@hivork/contracts/auth';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { refreshCookieName } from '../../auth/auth-cookies.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import type { StaffContext } from '../../common/types/auth-context.js';

@Controller('v1/staff/me/password')
@RequireAuth('staff')
export class StaffPasswordController {
  constructor(
    private readonly changeStaffPassword: ChangeStaffPasswordUseCase,
    private readonly getAccountSecurity: GetStaffAccountSecurityUseCase,
  ) {}

  @Post('change')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = ChangeStaffPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.changeStaffPassword.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOthers: parsed.data.revokeOthers,
        currentRefreshToken: request.cookies?.[refreshCookieName('staff')] as string | undefined,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get('account-security')
  async accountSecurity(@CurrentStaff() staff: StaffContext) {
    try {
      return await this.getAccountSecurity.execute({
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
