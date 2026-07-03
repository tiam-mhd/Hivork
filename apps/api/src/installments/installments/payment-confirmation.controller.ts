import {
  ApplicationError,
  ConfirmPaymentUseCase,
  RejectPaymentUseCase,
  VoidPaymentUseCase,
} from '@hivork/application';
import {
  ConfirmPaymentSchema,
  RejectPaymentSchema,
  VoidPaymentSchema,
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

/**
 * Payment confirmation API — IFP-092 confirm, IFP-093 reject, IFP-094 void.
 */
@Controller('v1/payment-attempts')
@RequireAuth('staff')
export class PaymentConfirmationController {
  constructor(
    private readonly confirmPayment: ConfirmPaymentUseCase,
    private readonly rejectPayment: RejectPaymentUseCase,
    private readonly voidPayment: VoidPaymentUseCase,
  ) {}

  /** POST /api/v1/payment-attempts/:attemptId/confirm */
  @Post(':attemptId/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.confirm')
  @ApplyDataScope()
  async confirm(
    @CurrentStaff() staff: StaffContext,
    @Param('attemptId') attemptIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const paymentAttemptId = parseResourceId(attemptIdParam, 'Payment attempt id');
    const parsed = ConfirmPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.confirmPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        paymentAttemptId,
        note: parsed.data.note,
        expectedAttemptVersion: parsed.data.expectedAttemptVersion,
        expectedInstallmentVersion: parsed.data.expectedInstallmentVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        paymentAttempt: {
          id: result.paymentAttempt.id,
          status: result.paymentAttempt.status,
          confirmedAt: result.paymentAttempt.confirmedAt.toISOString(),
          version: result.paymentAttempt.version,
        },
        installment: {
          id: result.installment.id,
          status: result.installment.status,
          paidAt: result.installment.paidAt?.toISOString() ?? null,
          version: result.installment.version,
        },
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

  /** POST /api/v1/payment-attempts/:attemptId/reject */
  @Post(':attemptId/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.reject')
  @ApplyDataScope()
  async reject(
    @CurrentStaff() staff: StaffContext,
    @Param('attemptId') attemptIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const paymentAttemptId = parseResourceId(attemptIdParam, 'Payment attempt id');
    const parsed = RejectPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.rejectPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        paymentAttemptId,
        rejectedReason: parsed.data.rejectedReason,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        paymentAttempt: {
          id: result.paymentAttempt.id,
          status: result.paymentAttempt.status,
          rejectedReason: result.paymentAttempt.rejectedReason,
          rejectedAt: result.paymentAttempt.rejectedAt.toISOString(),
          version: result.paymentAttempt.version,
        },
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

  /** POST /api/v1/payment-attempts/:attemptId/void */
  @Post(':attemptId/void')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.void')
  @ApplyDataScope()
  async voidAttempt(
    @CurrentStaff() staff: StaffContext,
    @Param('attemptId') attemptIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const paymentAttemptId = parseResourceId(attemptIdParam, 'Payment attempt id');
    const parsed = VoidPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.voidPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        paymentAttemptId,
        voidReason: parsed.data.voidReason,
        expectedAttemptVersion: parsed.data.expectedAttemptVersion,
        expectedInstallmentVersion: parsed.data.expectedInstallmentVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        paymentAttempt: {
          id: result.paymentAttempt.id,
          status: result.paymentAttempt.status,
          voidReason: result.paymentAttempt.voidReason,
          voidedAt: result.paymentAttempt.voidedAt.toISOString(),
          version: result.paymentAttempt.version,
        },
        installment: {
          id: result.installment.id,
          status: result.installment.status,
          paidAt: result.installment.paidAt?.toISOString() ?? null,
          version: result.installment.version,
        },
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
