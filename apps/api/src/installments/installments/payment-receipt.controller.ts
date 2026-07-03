import {
  ApplicationError,
  GeneratePaymentReceiptUseCase,
  SendPaymentReceiptUseCase,
} from '@hivork/application';
import { SendPaymentReceiptSchema } from '@hivork/contracts/installments';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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
 * Payment receipt API — IFP-095 print PDF + send via SMS/Bale.
 */
@Controller('v1/payment-attempts')
@RequireAuth('staff')
export class PaymentReceiptController {
  constructor(
    private readonly generateReceipt: GeneratePaymentReceiptUseCase,
    private readonly sendReceipt: SendPaymentReceiptUseCase,
  ) {}

  /** GET /api/v1/payment-attempts/:attemptId/receipt/pdf */
  @Get(':attemptId/receipt/pdf')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.read')
  @ApplyDataScope()
  async downloadPdf(
    @CurrentStaff() staff: StaffContext,
    @Param('attemptId') attemptIdParam: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const paymentAttemptId = parseResourceId(attemptIdParam, 'Payment attempt id');
    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.generateReceipt.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        paymentAttemptId,
        staffContext: toStaffContext(staff),
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Receipt-Number', result.receiptNumber);
      res.send(result.buffer);
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

  /** POST /api/v1/payment-attempts/:attemptId/receipt/send */
  @Post(':attemptId/receipt/send')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.receipt.send')
  @ApplyDataScope()
  async send(
    @CurrentStaff() staff: StaffContext,
    @Param('attemptId') attemptIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const paymentAttemptId = parseResourceId(attemptIdParam, 'Payment attempt id');
    const parsed = SendPaymentReceiptSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.sendReceipt.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        paymentAttemptId,
        channels: parsed.data.channels,
        recipientPhone: parsed.data.recipientPhone,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      res.status(result.idempotent ? HttpStatus.OK : HttpStatus.ACCEPTED);

      return {
        receiptNumber: result.receiptNumber,
        dispatched: result.dispatched,
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
