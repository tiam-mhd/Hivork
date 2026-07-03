import {
  ApplicationError,
  GetReconciliationReportUseCase,
  ResolveDiscrepancyUseCase,
} from '@hivork/application';
import {
  GetReconciliationReportResponseSchema,
  ResolveDiscrepancyBodySchema,
  ResolveDiscrepancyResponseSchema,
} from '@hivork/contracts/payments';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { parseResourceId, toStaffContext } from '../sales/sales.controller.helpers.js';

@Controller('v1/payments/reconciliations')
@RequireAuth('staff')
export class ReconciliationController {
  constructor(
    private readonly getReconciliationReport: GetReconciliationReportUseCase,
    private readonly resolveDiscrepancy: ResolveDiscrepancyUseCase,
  ) {}

  /** GET /api/v1/payments/reconciliations/:id */
  @Get(':id')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.reconciliation.manage')
  @ApplyDataScope()
  async getById(@CurrentStaff() staff: StaffContext, @Param('id') idParam: string) {
    const reconciliationReportId = parseResourceId(idParam, 'Reconciliation report id');

    try {
      const result = await this.getReconciliationReport.execute({
        tenantId: staff.tenantId,
        reconciliationReportId,
        staffContext: toStaffContext(staff),
      });

      return GetReconciliationReportResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }

  /** POST /api/v1/payments/reconciliations/discrepancies/:id/resolve */
  @Post('discrepancies/:id/resolve')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.reconciliation.manage')
  @ApplyDataScope()
  async resolve(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const discrepancyId = parseResourceId(idParam, 'Discrepancy id');
    const parsed = ResolveDiscrepancyBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.resolveDiscrepancy.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        discrepancyId,
        resolveNote: parsed.data.resolveNote,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return ResolveDiscrepancyResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }
}
