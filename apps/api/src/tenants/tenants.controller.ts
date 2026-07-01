import {
  ApplicationError,
  GetCurrentTenantUseCase,
  RegisterTenantUseCase,
} from '@hivork/application';
import { RegisterTenantSchema, normalizePhone } from '@hivork/contracts';
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
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { setRefreshCookie } from '../auth/auth-cookies';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import { RequireAuth } from '../common/decorators/require-auth.decorator';
import type { StaffContext } from '../common/types/auth-context';
import { AppConfigService } from '../config/app-config.service';
import { toTenantResponse } from './tenants.response';

@Controller('v1/tenants')
export class TenantsController {
  constructor(
    private readonly registerTenantUseCase: RegisterTenantUseCase,
    private readonly getCurrentTenant: GetCurrentTenantUseCase,
    private readonly appConfig: AppConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = RegisterTenantSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.registerTenantUseCase.execute({
        name: parsed.data.name,
        slug: parsed.data.slug,
        legalName: parsed.data.legalName,
        taxId: parsed.data.taxId,
        phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : undefined,
        email: parsed.data.email,
        ownerName: parsed.data.ownerName,
        ownerPhone: normalizePhone(parsed.data.ownerPhone),
        verifiedToken: parsed.data.verifiedToken,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
      });

      setRefreshCookie(res, this.appConfig, 'staff', result.refreshToken);

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        staff: result.staff,
        tenant: result.tenant,
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @RequireAuth('staff')
  async getMe(@CurrentStaff() staff: StaffContext) {
    try {
      const result = await this.getCurrentTenant.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        activeBranchId: staff.activeBranchId,
      });

      return {
        staffId: result.staffId,
        activeBranchId: result.activeBranchId,
        tenant: toTenantResponse(result.tenant),
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
