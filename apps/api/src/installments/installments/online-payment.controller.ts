import {
  ApplicationError,
  InitOnlinePaymentUseCase,
} from '@hivork/application';
import { InitOnlinePaymentBodySchema } from '@hivork/contracts/installments';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';

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

const idempotencyKeySchema = z.string().uuid();

/** Online payment init API — IFP-089. */
@Controller('v1/installments')
@RequireAuth('staff')
export class OnlinePaymentController {
  constructor(private readonly initOnlinePayment: InitOnlinePaymentUseCase) {}

  /** POST /api/v1/installments/:installmentId/payments/online/init */
  @Post(':installmentId/payments/online/init')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async initOnlinePaymentSession(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = InitOnlinePaymentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    let idempotencyKey: string | undefined;
    if (idempotencyKeyHeader !== undefined) {
      const idempotencyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
      if (!idempotencyResult.success) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Idempotency-Key must be a valid UUID.',
        });
      }
      idempotencyKey = idempotencyResult.data;
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.initOnlinePayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        amountRial: BigInt(parsed.data.amountRial),
        returnUrl: parsed.data.returnUrl,
        idempotencyKey,
        staffContext: toStaffContext(staff),
      });

      response.status(
        result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED,
      );

      return {
        paymentAttemptId: result.paymentAttemptId,
        redirectUrl: result.redirectUrl,
        gatewayToken: result.gatewayToken,
        expiresAt: result.expiresAt.toISOString(),
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
