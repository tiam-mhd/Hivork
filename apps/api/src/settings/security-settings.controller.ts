import {
  ApplicationError,
  GetSecuritySettingsUseCase,
  UpdateSecuritySettingsUseCase,
} from '@hivork/application';
import { UpdateSecuritySettingsSchema } from '@hivork/contracts/settings';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { CurrentStaff } from '../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import type { StaffContext } from '../common/types/auth-context.js';

@Controller('v1/settings/security')
@RequireAuth('staff')
export class SecuritySettingsController {
  constructor(
    private readonly getSecuritySettings: GetSecuritySettingsUseCase,
    private readonly updateSecuritySettings: UpdateSecuritySettingsUseCase,
  ) {}

  @Get()
  @RequirePermission('core.settings.view')
  async getSettings(@CurrentStaff() staff: StaffContext) {
    try {
      const result = await this.getSecuritySettings.execute({ tenantId: staff.tenantId });
      return { data: result };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.settings.edit')
  async patchSettings(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = UpdateSecuritySettingsSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: issue?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.updateSecuritySettings.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        patch: parsed.data,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: result };
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
