import {
  ApplicationError,
  CreatePrintSnapshotUseCase,
  GetPrintSnapshotUseCase,
} from '@hivork/application';
import { CreatePrintSnapshotSchema } from '@hivork/contracts/core';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { AppConfigService } from '../../config/app-config.service.js';

const tokenParamSchema = z.string().uuid();

function toStaffContext(staff: StaffContext) {
  return {
    staffId: staff.id,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: staff.activeBranchId,
  };
}

@Controller('v1/print-snapshots')
@RequireAuth('staff')
export class PrintSnapshotsController {
  constructor(
    private readonly createPrintSnapshot: CreatePrintSnapshotUseCase,
    private readonly getPrintSnapshot: GetPrintSnapshotUseCase,
    private readonly appConfig: AppConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.export')
  @ApplyDataScope()
  async create(@CurrentStaff() staff: StaffContext, @Body() body: unknown, @Req() req: Request) {
    const parsed = CreatePrintSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      const filterInvalid = parsed.error.issues.some((issue) => issue.path.includes('filter'));
      throw new BadRequestException({
        code: filterInvalid ? 'FILTER_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    if (parsed.data.resourceKey !== 'customers') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Unsupported print resource.',
      });
    }

    try {
      const result = await this.createPrintSnapshot.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        resourceKey: 'customers',
        search: parsed.data.search,
        filter: parsed.data.filter,
        sort: parsed.data.sort,
        tags: parsed.data.tags,
        status: parsed.data.status,
        defaultBranchId: parsed.data.defaultBranchId,
        columns: parsed.data.columns,
        ids: parsed.data.ids,
        locale: parsed.data.locale,
        orientation: parsed.data.orientation,
        staffContext: toStaffContext(staff),
        maxRows: this.appConfig.pdfMaxRows,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        filterHashPayload: parsed.data,
      });

      return {
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':token')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.export')
  async getByToken(@CurrentStaff() staff: StaffContext, @Param('token') token: string) {
    const parsed = tokenParamSchema.safeParse(token);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid print token.',
      });
    }

    try {
      return await this.getPrintSnapshot.execute({
        token: parsed.data,
        tenantId: staff.tenantId,
        staffId: staff.id,
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
