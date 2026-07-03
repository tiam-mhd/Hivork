import {
  ApplicationError,
  ApplyDiscountUseCase,
  ApplyPenaltyUseCase,
  CalculatePenaltyPreviewUseCase,
  WaiveInstallmentUseCase,
} from '@hivork/application';
import {
  ApplyDiscountSchema,
  ApplyPenaltySchema,
  WaiveInstallmentSchema,
} from '@hivork/contracts/installments';
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

/**
 * Installment adjustment API — IFP-096 waive, IFP-097 penalty, IFP-098 discount (Epic-04 Adjustments).
 */
@Controller('v1/installments')
@RequireAuth('staff')
export class InstallmentAdjustmentsController {
  constructor(
    private readonly waiveInstallment: WaiveInstallmentUseCase,
    private readonly applyPenalty: ApplyPenaltyUseCase,
    private readonly calculatePenaltyPreview: CalculatePenaltyPreviewUseCase,
    private readonly applyDiscount: ApplyDiscountUseCase,
  ) {}

  /** GET /api/v1/installments/:installmentId/penalty/preview */
  @Get(':installmentId/penalty/preview')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.penalty')
  @ApplyDataScope()
  async penaltyPreview(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const branchId = resolveBranchId(staff, request);

    try {
      return await this.calculatePenaltyPreview.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        staffContext: toStaffContext(staff),
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

  /** POST /api/v1/installments/:installmentId/penalty */
  @Post(':installmentId/penalty')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.penalty')
  @ApplyDataScope()
  async applyPenaltyEndpoint(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = ApplyPenaltySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.applyPenalty.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        mode: parsed.data.mode,
        amountRial:
          parsed.data.mode === 'manual' ? BigInt(parsed.data.amountRial) : undefined,
        reason: parsed.data.reason,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        adjustment: {
          id: result.adjustment.id,
          amountRial: result.adjustment.amountRial,
          reason: result.adjustment.reason,
          appliedAt: result.adjustment.appliedAt.toISOString(),
        },
        installment: result.installment,
        remainingRial: result.remainingRial,
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

  /** POST /api/v1/installments/:installmentId/discount */
  @Post(':installmentId/discount')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.discount')
  @ApplyDataScope()
  async applyDiscountEndpoint(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = ApplyDiscountSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.applyDiscount.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        discountRial: BigInt(parsed.data.discountRial),
        reason: parsed.data.reason,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        installment: result.installment,
        adjustment: result.adjustment,
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

  /** POST /api/v1/installments/:installmentId/waive */
  @Post(':installmentId/waive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.waive')
  @ApplyDataScope()
  async waive(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = WaiveInstallmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.waiveInstallment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        waiveReason: parsed.data.waiveReason,
        expectedVersion: parsed.data.expectedVersion,
        rejectPendingPayments: parsed.data.rejectPendingPayments,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        installment: {
          id: result.installment.id,
          status: result.installment.status,
          waiveReason: result.installment.waiveReason,
          waivedByStaffId: result.installment.waivedByStaffId,
          version: result.installment.version,
        },
        rejectedPaymentAttemptIds: result.rejectedPaymentAttemptIds,
        remainingRial: result.remainingRial,
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
