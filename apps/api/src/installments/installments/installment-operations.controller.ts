import {
  AccelerateInstallmentUseCase,
  ApplicationError,
  DeferInstallmentUseCase,
  RescheduleInstallmentUseCase,
  SplitInstallmentUseCase,
} from '@hivork/application';
import {
  AccelerateInstallmentSchema,
  DeferInstallmentSchema,
  RescheduleInstallmentSchema,
  SplitInstallmentSchema,
} from '@hivork/contracts/installments';
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
  parseResourceId,
  resolveBranchId,
  toStaffContext,
} from '../sales/sales.controller.helpers.js';

const INSTALLMENT_STATUS_RESPONSE: Record<string, string> = {
  PENDING: 'pending',
  OVERDUE: 'overdue',
  PAID: 'paid',
  WAIVED: 'waived',
};

/**
 * Advanced installment operations API — IFP-080 reschedule, IFP-081 defer, IFP-082 accelerate, IFP-085 split.
 */
@Controller('v1/installments')
@RequireAuth('staff')
export class InstallmentOperationsController {
  constructor(
    private readonly rescheduleInstallment: RescheduleInstallmentUseCase,
    private readonly deferInstallment: DeferInstallmentUseCase,
    private readonly accelerateInstallment: AccelerateInstallmentUseCase,
    private readonly splitInstallment: SplitInstallmentUseCase,
  ) {}

  /** POST /api/v1/installments/:installmentId/reschedule */
  @Post(':installmentId/reschedule')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.reschedule')
  @ApplyDataScope()
  async reschedule(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = RescheduleInstallmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.rescheduleInstallment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        newDueDate: parsed.data.newDueDate,
        reason: parsed.data.reason,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        installment: {
          id: result.installment.id,
          sequenceNumber: result.installment.sequenceNumber,
          dueDate: result.installment.dueDate.toISOString(),
          amountRial: result.installment.amountRial.toString(),
          status: INSTALLMENT_STATUS_RESPONSE[result.installment.status] ?? result.installment.status,
          version: result.installment.version,
        },
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

  /** POST /api/v1/installments/:installmentId/defer */
  @Post(':installmentId/defer')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.defer')
  @ApplyDataScope()
  async defer(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = DeferInstallmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.deferInstallment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        deferDays: parsed.data.deferDays,
        reason: parsed.data.reason,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        installment: {
          id: result.installment.id,
          dueDate: result.installment.dueDate.toISOString(),
          status: INSTALLMENT_STATUS_RESPONSE[result.installment.status] ?? result.installment.status,
          version: result.installment.version,
        },
        operationLogId: result.operationLogId,
        previousDueDate: result.previousDueDate.toISOString(),
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

  /** POST /api/v1/installments/:installmentId/accelerate */
  @Post(':installmentId/accelerate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.accelerate')
  @ApplyDataScope()
  async accelerate(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = AccelerateInstallmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.accelerateInstallment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        newDueDate: parsed.data.newDueDate,
        reason: parsed.data.reason,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        installment: {
          id: result.installment.id,
          dueDate: result.installment.dueDate.toISOString(),
          status: INSTALLMENT_STATUS_RESPONSE[result.installment.status] ?? result.installment.status,
          version: result.installment.version,
        },
        operationLogId: result.operationLogId,
        previousDueDate: result.previousDueDate.toISOString(),
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

  /** POST /api/v1/installments/:installmentId/split */
  @Post(':installmentId/split')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.split')
  @ApplyDataScope()
  async split(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = SplitInstallmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const data = parsed.data;
      const result = await this.splitInstallment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        reason: data.reason,
        expectedVersion: data.expectedVersion,
        parts: 'parts' in data ? data.parts : undefined,
        partCount: 'partCount' in data ? data.partCount : undefined,
        firstDueDate: 'firstDueDate' in data ? data.firstDueDate : undefined,
        intervalDays: 'intervalDays' in data ? data.intervalDays : undefined,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        originalInstallmentId: result.originalInstallmentId,
        newInstallments: result.newInstallments.map((item) => ({
          id: item.id,
          sequenceNumber: item.sequenceNumber,
          amountRial: item.amountRial.toString(),
          dueDate: item.dueDate.toISOString(),
        })),
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
