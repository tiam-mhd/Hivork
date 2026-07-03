import {
  ApplicationError,
  CreateUnifiedPaymentUseCase,
  ListEnabledPaymentMethodsUseCase,
} from '@hivork/application';
import {
  CreateUnifiedPaymentSchema,
  UnifiedPaymentResponseSchema,
} from '@hivork/contracts/payments';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
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
import { resolveBranchId, toStaffContext } from '../sales/sales.controller.helpers.js';

const idempotencyKeySchema = z.string().uuid();

/**
 * Unified payment gateway API — IFP-105.
 * POST /api/v1/payments dispatches to per-method record use cases.
 */
@Controller('v1/payments')
@RequireAuth('staff')
export class UnifiedPaymentsController {
  constructor(
    private readonly createUnifiedPayment: CreateUnifiedPaymentUseCase,
    private readonly listEnabledPaymentMethods: ListEnabledPaymentMethodsUseCase,
  ) {}

  /** GET /api/v1/payments/methods */
  @Get('methods')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.read')
  async listMethods(@CurrentStaff() staff: StaffContext) {
    try {
      return await this.listEnabledPaymentMethods.execute({
        tenantId: staff.tenantId,
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

  /** POST /api/v1/payments */
  @Post()
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = CreateUnifiedPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    if (idempotencyKeyHeader === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key header is required.',
      });
    }

    const idempotencyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
    if (!idempotencyResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key must be a valid UUID.',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.createUnifiedPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        idempotencyKey: idempotencyResult.data,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        body: {
          ...parsed.data,
          amountRial: BigInt(parsed.data.amountRial),
        },
      });

      response.status(result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED);

      const { idempotentReplay: _replay, ...payload } = result;
      const validated = UnifiedPaymentResponseSchema.parse({
        ...payload,
        paymentAttempt: {
          ...payload.paymentAttempt,
          amountRial: payload.paymentAttempt.amountRial,
        },
      });

      return validated;
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
