import {
  ApplicationError,
  MergeInstallmentsUseCase,
  PreviewRegenerateInstallmentsUseCase,
  RegenerateInstallmentsUseCase,
} from '@hivork/application';
import { MergeInstallmentsSchema, RegenerateInstallmentsSchema } from '@hivork/contracts/installments';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
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
import {
  parseSaleId,
  resolveBranchId,
  toStaffContext,
} from './sales.controller.helpers.js';

const INSTALLMENT_STATUS_RESPONSE: Record<string, string> = {
  PENDING: 'pending',
  OVERDUE: 'overdue',
  PAID: 'paid',
  WAIVED: 'waived',
};

function toSchedulePayload(schedule: {
  firstDueDate?: string;
  installmentCount?: number;
  intervalDays?: number;
  customDueDates?: string[];
}) {
  return {
    ...(schedule.firstDueDate ? { firstDueDate: schedule.firstDueDate } : {}),
    ...(schedule.installmentCount !== undefined
      ? { installmentCount: schedule.installmentCount }
      : {}),
    ...(schedule.intervalDays !== undefined ? { intervalDays: schedule.intervalDays } : {}),
    ...(schedule.customDueDates ? { customDueDates: schedule.customDueDates } : {}),
  };
}

function mapRegenerateResponse(result: {
  saleId: string;
  removedInstallmentIds: string[];
  newInstallments: Array<{
    id?: string;
    sequenceNumber: number;
    dueDate: Date;
    amountRial: bigint;
    status: string;
  }>;
  totalAmountRial: bigint;
  operationLogId?: string;
}) {
  return {
    saleId: result.saleId,
    removedInstallmentIds: result.removedInstallmentIds,
    newInstallments: result.newInstallments.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      sequenceNumber: item.sequenceNumber,
      dueDate: item.dueDate.toISOString(),
      amountRial: item.amountRial.toString(),
      status: INSTALLMENT_STATUS_RESPONSE[item.status] ?? item.status,
    })),
    totalAmountRial: result.totalAmountRial.toString(),
    ...(result.operationLogId ? { operationLogId: result.operationLogId } : {}),
  };
}

/** Sale installment advanced operations API — IFP-083 regenerate, IFP-084 merge. */
@Controller('v1/sales')
@RequireAuth('staff')
export class SaleInstallmentsController {
  constructor(
    private readonly previewRegenerateInstallments: PreviewRegenerateInstallmentsUseCase,
    private readonly regenerateInstallments: RegenerateInstallmentsUseCase,
    private readonly mergeInstallments: MergeInstallmentsUseCase,
  ) {}

  /** POST /api/v1/sales/:saleId/installments/regenerate/preview */
  @Post(':saleId/installments/regenerate/preview')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.regenerate')
  @ApplyDataScope()
  async previewRegenerate(
    @CurrentStaff() staff: StaffContext,
    @Param('saleId') saleIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(saleIdParam);
    const parsed = RegenerateInstallmentsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.previewRegenerateInstallments.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        saleId,
        schedule: toSchedulePayload(parsed.data.schedule),
        roundingPolicy: parsed.data.roundingPolicy,
        staffContext: toStaffContext(staff),
      });

      return mapRegenerateResponse({
        ...result,
        newInstallments: result.newInstallments.map((item) => ({
          ...item,
          status: 'PENDING',
        })),
      });
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

  /** POST /api/v1/sales/:saleId/installments/regenerate */
  @Post(':saleId/installments/regenerate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.regenerate')
  @ApplyDataScope()
  async regenerate(
    @CurrentStaff() staff: StaffContext,
    @Param('saleId') saleIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(saleIdParam);
    const parsed = RegenerateInstallmentsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.regenerateInstallments.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        saleId,
        reason: parsed.data.reason,
        schedule: toSchedulePayload(parsed.data.schedule),
        roundingPolicy: parsed.data.roundingPolicy,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return mapRegenerateResponse(result);
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

  /** POST /api/v1/sales/:saleId/installments/merge */
  @Post(':saleId/installments/merge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.merge')
  @ApplyDataScope()
  async merge(
    @CurrentStaff() staff: StaffContext,
    @Param('saleId') saleIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(saleIdParam);
    const parsed = MergeInstallmentsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.mergeInstallments.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        saleId,
        installmentIds: parsed.data.installmentIds,
        targetDueDate: parsed.data.targetDueDate,
        reason: parsed.data.reason,
        expectedVersions: parsed.data.expectedVersions,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        mergedInstallment: {
          id: result.mergedInstallment.id,
          sequenceNumber: result.mergedInstallment.sequenceNumber,
          dueDate: result.mergedInstallment.dueDate.toISOString(),
          amountRial: result.mergedInstallment.amountRial.toString(),
          status:
            INSTALLMENT_STATUS_RESPONSE[result.mergedInstallment.status] ??
            result.mergedInstallment.status,
        },
        removedInstallmentIds: result.removedInstallmentIds,
        operationLogId: result.operationLogId,
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
}
