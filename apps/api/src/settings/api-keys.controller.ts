import {
  ApplicationError,
  CreateTenantApiKeyUseCase,
  ListTenantApiKeysUseCase,
  RevokeTenantApiKeyUseCase,
} from '@hivork/application';
import {
  CreateTenantApiKeySchema,
  ListTenantApiKeysQuerySchema,
} from '@hivork/contracts';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { CurrentStaff } from '../common/decorators/current-staff.decorator.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import type { StaffContext } from '../common/types/auth-context.js';

@Controller('v1/settings/api-keys')
export class ApiKeysController {
  constructor(
    private readonly listApiKeys: ListTenantApiKeysUseCase,
    private readonly createApiKey: CreateTenantApiKeyUseCase,
    private readonly revokeApiKey: RevokeTenantApiKeyUseCase,
  ) {}

  @Get()
  @RequirePermission('core.security.apikey.view')
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListTenantApiKeysQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      return await this.listApiKeys.execute({
        tenantId: staff.tenantId,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        status: parsed.data.status,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('core.security.apikey.create')
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = CreateTenantApiKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.createApiKey.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        name: parsed.data.name,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @RequirePermission('core.security.apikey.revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    try {
      return await this.revokeApiKey.execute({
        tenantId: staff.tenantId,
        apiKeyId: id,
        actorId: staff.id,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
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
