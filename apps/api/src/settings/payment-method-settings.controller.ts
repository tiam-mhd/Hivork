import {
  ApplicationError,
  GetPaymentMethodSettingsUseCase,
  UpdatePaymentMethodSettingsUseCase,
} from '@hivork/application';
import { UpdatePaymentMethodSettingsSchema } from '@hivork/contracts/settings';
import { RequireModule } from '@hivork/module-core';
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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { CurrentStaff } from '../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../common/guards/module.guard.js';
import type { StaffContext } from '../common/types/auth-context.js';

/** Payment method tenant settings — IFP-106. */
@Controller('v1/settings/payment-methods')
@RequireAuth('staff')
export class PaymentMethodSettingsController {
  constructor(
    private readonly getPaymentMethodSettings: GetPaymentMethodSettingsUseCase,
    private readonly updatePaymentMethodSettings: UpdatePaymentMethodSettingsUseCase,
  ) {}

  /** GET /api/v1/settings/payment-methods */
  @Get()
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('core.settings.view')
  async getSettings(@CurrentStaff() staff: StaffContext) {
    try {
      const result = await this.getPaymentMethodSettings.execute({ tenantId: staff.tenantId });
      return { data: result };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** PATCH /api/v1/settings/payment-methods */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('core.settings.edit')
  async patchSettings(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = UpdatePaymentMethodSettingsSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new BadRequestException({
        code:
          issue?.message === 'DUPLICATE_METHOD' || issue?.message === 'DUPLICATE_DISPLAY_ORDER'
            ? issue.message
            : 'VALIDATION_ERROR',
        message: issue?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.updatePaymentMethodSettings.execute({
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
