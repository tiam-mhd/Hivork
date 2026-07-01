import {
  ApplicationError,
  GetInstallmentSettingsUseCase,
  GetSettingsUseCase,
  UpdateInstallmentSettingsUseCase,
  UpdateSettingUseCase,
} from '@hivork/application';
import { UpdateInstallmentsSettingsSchema } from '@hivork/contracts/installments';
import { GetSettingsQuerySchema, UpdateSettingBodySchema } from '@hivork/contracts/settings';
import { RequireModule } from '@hivork/module-core';
import { PrismaModuleEntitlement } from '@hivork/infrastructure';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { CurrentStaff } from '../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../common/guards/module.guard.js';
import type { StaffContext } from '../common/types/auth-context.js';

const INSTALLMENTS_MODULE = 'installments';

@Controller('v1/settings')
@RequireAuth('staff')
export class SettingsController {
  constructor(
    private readonly getSettingsUseCase: GetSettingsUseCase,
    private readonly updateSettingUseCase: UpdateSettingUseCase,
    private readonly getInstallmentSettings: GetInstallmentSettingsUseCase,
    private readonly updateInstallmentSettings: UpdateInstallmentSettingsUseCase,
    private readonly moduleEntitlement: PrismaModuleEntitlement,
  ) {}

  @Get('installments')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.reminder.configure')
  async getInstallmentsSettingsRoute(@CurrentStaff() staff: StaffContext) {
    return this.getInstallmentsSettings(staff);
  }

  @Patch('installments')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.reminder.configure')
  async patchInstallmentsSettingsRoute(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.patchInstallmentsSettingsBody(staff, body, request);
  }

  @Get()
  @RequirePermission('core.settings.view')
  async getSettings(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = GetSettingsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    if (parsed.data.module === INSTALLMENTS_MODULE) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Use GET /api/v1/settings/installments for installments settings.',
      });
    }

    try {
      return await this.getSettingsUseCase.execute({
        tenantId: staff.tenantId,
        module: parsed.data.module,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.settings.edit')
  async patchSettingsLegacy(
    @CurrentStaff() _staff: StaffContext,
    @Query() query: unknown,
    @Body() _body: unknown,
  ) {
    const parsedQuery = GetSettingsQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsedQuery.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    if (parsedQuery.data.module === INSTALLMENTS_MODULE) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Use PATCH /api/v1/settings/installments for installments settings.',
      });
    }

    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'PATCH is only supported for installments module via /settings/installments.',
    });
  }

  @Put(':module/:key')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.settings.edit')
  async updateSetting(
    @CurrentStaff() staff: StaffContext,
    @Param('module') module: string,
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    if (module === INSTALLMENTS_MODULE) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Use PATCH /api/v1/settings/installments for installments settings.',
      });
    }

    const parsed = UpdateSettingBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.updateSettingUseCase.execute({
        tenantId: staff.tenantId,
        module,
        key,
        value: parsed.data.value,
        staffId: staff.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private async patchInstallmentsSettingsBody(
    staff: StaffContext,
    body: unknown,
    request: Request,
  ) {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
      });
    }

    if (Object.keys(body).length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Patch body must include at least one setting key.',
      });
    }

    const parsedBody = UpdateInstallmentsSettingsSchema.safeParse(body);
    if (!parsedBody.success) {
      const issue = parsedBody.error.issues[0];
      throw new BadRequestException({
        code: issue?.code === 'unrecognized_keys' ? 'SETTING_KEY_UNKNOWN' : 'SETTING_VALUE_INVALID',
        message: issue?.message ?? 'Invalid request body',
      });
    }

    try {
      await this.moduleEntitlement.assertModuleEnabled(staff.tenantId, INSTALLMENTS_MODULE);

      const result = await this.updateInstallmentSettings.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        patch: parsedBody.data,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        data: {
          installments: result.installments,
        },
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private async getInstallmentsSettings(staff: StaffContext) {
    try {
      await this.moduleEntitlement.assertModuleEnabled(staff.tenantId, INSTALLMENTS_MODULE);

      const result = await this.getInstallmentSettings.execute({
        tenantId: staff.tenantId,
      });

      return {
        data: {
          installments: result.installments,
        },
      };
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
