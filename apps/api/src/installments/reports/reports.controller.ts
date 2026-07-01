import {
  ApplicationError,
  GetCashflowForecastUseCase,
  GetDashboardReportUseCase,
  ListOverdueReportUseCase,
  ListTodayDueInstallmentsUseCase,
} from '@hivork/application';
import { parseBigIntRial } from '@hivork/contracts';
import {
  CashflowReportQuerySchema,
  DashboardReportQuerySchema,
  OverdueReportQuerySchema,
  TodayDueReportQuerySchema,
} from '@hivork/contracts/reports';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { toInstallmentSummaryResponse } from '../installments/installments.response.js';

function toStaffContext(staff: StaffContext) {
  return {
    staffId: staff.id,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: staff.activeBranchId,
  };
}

@Controller('v1/reports')
@RequireAuth('staff')
export class ReportsController {
  constructor(
    private readonly getDashboardReport: GetDashboardReportUseCase,
    private readonly getCashflowForecast: GetCashflowForecastUseCase,
    private readonly listTodayDue: ListTodayDueInstallmentsUseCase,
    private readonly listOverdueReport: ListOverdueReportUseCase,
  ) {}

  @Get('cashflow')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.report.dashboard')
  @ApplyDataScope()
  async cashflow(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = CashflowReportQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.getCashflowForecast.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        branchId: parsed.data.branchId,
        activeBranchId: staff.activeBranchId ?? undefined,
      });

      return {
        data: {
          buckets: result.data,
          fromMonth: result.fromMonth,
          toMonth: result.toMonth,
          updatedAt: result.updatedAt,
        },
        meta: {},
      };
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

  @Get('today-due')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.report.dashboard')
  @ApplyDataScope()
  async todayDue(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = TodayDueReportQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listTodayDue.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        branchId: parsed.data.branchId,
        activeBranchId: staff.activeBranchId ?? undefined,
        search: parsed.data.search,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
      });

      return {
        data: result.data.map(toInstallmentSummaryResponse),
        meta: result.meta,
      };
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

  @Get('overdue')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.report.overdue')
  @ApplyDataScope()
  async overdue(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = OverdueReportQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listOverdueReport.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        branchId: parsed.data.branchId,
        activeBranchId: staff.activeBranchId ?? undefined,
        overdueDaysMin: parsed.data.overdueDaysMin,
        overdueDaysMax: parsed.data.overdueDaysMax,
        search: parsed.data.search,
        minAmountRial: parsed.data.minAmountRial
          ? parseBigIntRial(parsed.data.minAmountRial)
          : undefined,
        sort: parsed.data.sort,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
      });

      return {
        data: result.data,
        meta: result.meta,
      };
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

  @Get('dashboard')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.report.dashboard')
  @ApplyDataScope()
  async dashboard(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = DashboardReportQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.getDashboardReport.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        branchId: parsed.data.branchId,
        activeBranchId: staff.activeBranchId ?? undefined,
      });

      return result;
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
