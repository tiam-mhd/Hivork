import {
  ApplicationError,
  RecordBankTransferPaymentUseCase,
  RecordCashManualPaymentUseCase,
  RecordCheckPaymentUseCase,
  RecordFeePaymentUseCase,
  RecordPosPaymentUseCase,
  type PaymentAttemptDetailResult,
} from '@hivork/application';
import { RequireModule } from '@hivork/module-core';
import {
  RecordBankTransferPaymentBodySchema,
  RecordCashManualPaymentBodySchema,
  RecordCheckPaymentBodySchema,
  RecordFeePaymentBodySchema,
  RecordPosPaymentBodySchema,
} from '@hivork/contracts/installments';
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

/**
 * Payment recording API — IFP-087 cash/manual, IFP-088+ other methods.
 */
@Controller('v1/installments')
@RequireAuth('staff')
export class PaymentRecordingController {
  constructor(
    private readonly recordCashManualPayment: RecordCashManualPaymentUseCase,
    private readonly recordBankTransferPayment: RecordBankTransferPaymentUseCase,
    private readonly recordPosPayment: RecordPosPaymentUseCase,
    private readonly recordCheckPayment: RecordCheckPaymentUseCase,
    private readonly recordFeePayment: RecordFeePaymentUseCase,
  ) {}

  /** POST /api/v1/installments/:installmentId/payments/cash */
  @Post(':installmentId/payments/cash')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async recordCash(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.recordPayment(
      staff,
      installmentIdParam,
      body,
      idempotencyKeyHeader,
      request,
      response,
      'cash',
    );
  }

  /** POST /api/v1/installments/:installmentId/payments/manual */
  @Post(':installmentId/payments/manual')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async recordManual(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.recordPayment(
      staff,
      installmentIdParam,
      body,
      idempotencyKeyHeader,
      request,
      response,
      'manual',
    );
  }

  /** POST /api/v1/installments/:installmentId/payments/bank-transfer */
  @Post(':installmentId/payments/bank-transfer')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async recordBankTransfer(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = RecordBankTransferPaymentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const idempotencyKey = this.parseIdempotencyKey(idempotencyKeyHeader);
    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.recordBankTransferPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        amountRial: BigInt(parsed.data.amountRial),
        bankName: parsed.data.bankName,
        referenceNumber: parsed.data.referenceNumber,
        transferDate: parsed.data.transferDate,
        accountLast4: parsed.data.accountLast4,
        note: parsed.data.note,
        evidenceFileId: parsed.data.evidenceFileId ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
        idempotencyKey,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      response.status(
        result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED,
      );

      return this.formatPaymentAttemptResponse(result.paymentAttempt);
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

  /** POST /api/v1/installments/:installmentId/payments/pos */
  @Post(':installmentId/payments/pos')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async recordPos(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = RecordPosPaymentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const idempotencyKey = this.parseIdempotencyKey(idempotencyKeyHeader);
    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.recordPosPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        amountRial: BigInt(parsed.data.amountRial),
        terminalId: parsed.data.terminalId,
        traceNumber: parsed.data.traceNumber,
        cardLast4: parsed.data.cardLast4,
        batchNumber: parsed.data.batchNumber,
        note: parsed.data.note,
        evidenceFileId: parsed.data.evidenceFileId ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
        idempotencyKey,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      response.status(
        result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED,
      );

      return this.formatPaymentAttemptResponse(result.paymentAttempt, { includeMetadata: true });
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

  /** POST /api/v1/installments/:installmentId/payments/check */
  @Post(':installmentId/payments/check')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async recordCheck(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = RecordCheckPaymentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const idempotencyKey = this.parseIdempotencyKey(idempotencyKeyHeader);
    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.recordCheckPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        amountRial: BigInt(parsed.data.amountRial),
        checkNumber: parsed.data.checkNumber,
        bankName: parsed.data.bankName,
        dueDate: parsed.data.dueDate,
        drawerName: parsed.data.drawerName,
        branchCode: parsed.data.branchCode,
        sayadId: parsed.data.sayadId,
        note: parsed.data.note,
        evidenceFileId: parsed.data.evidenceFileId ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
        idempotencyKey,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      response.status(
        result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED,
      );

      return this.formatPaymentAttemptResponse(result.paymentAttempt, { includeMetadata: true });
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

  /** POST /api/v1/installments/:installmentId/payments/fee */
  @Post(':installmentId/payments/fee')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.report')
  @ApplyDataScope()
  async recordFee(
    @CurrentStaff() staff: StaffContext,
    @Param('installmentId') installmentIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = RecordFeePaymentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const idempotencyKey = this.parseIdempotencyKey(idempotencyKeyHeader);
    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.recordFeePayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        amountRial: BigInt(parsed.data.amountRial),
        feeType: parsed.data.feeType,
        feeDescription: parsed.data.feeDescription,
        note: parsed.data.note,
        evidenceFileId: parsed.data.evidenceFileId ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
        idempotencyKey,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      response.status(
        result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED,
      );

      return this.formatPaymentAttemptResponse(result.paymentAttempt, { includeMetadata: true });
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

  private parseIdempotencyKey(idempotencyKeyHeader: string | undefined): string | undefined {
    if (idempotencyKeyHeader === undefined) {
      return undefined;
    }

    const idempotencyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
    if (!idempotencyResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key must be a valid UUID.',
      });
    }

    return idempotencyResult.data;
  }

  private formatPaymentAttemptResponse(
    paymentAttempt: PaymentAttemptDetailResult,
    options?: { includeMetadata?: boolean },
  ) {
    const metadata =
      options?.includeMetadata && paymentAttempt.methodDetails
        ? Object.fromEntries(
            Object.entries(paymentAttempt.methodDetails).filter(
              ([key]) => key !== 'method' && key !== 'requestHash',
            ),
          )
        : undefined;

    return {
      paymentAttempt: {
        id: paymentAttempt.id,
        installmentId: paymentAttempt.installmentId,
        amountRial: paymentAttempt.amountRial.toString(),
        status: paymentAttempt.status,
        method: paymentAttempt.method,
        createdAt: paymentAttempt.createdAt.toISOString(),
        ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
      },
    };
  }

  private async recordPayment(
    staff: StaffContext,
    installmentIdParam: string,
    body: unknown,
    idempotencyKeyHeader: string | undefined,
    request: Request,
    response: Response,
    method: 'cash' | 'manual',
  ) {
    const installmentId = parseResourceId(installmentIdParam, 'Installment id');
    const parsed = RecordCashManualPaymentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const idempotencyKey = this.parseIdempotencyKey(idempotencyKeyHeader);
    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.recordCashManualPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        installmentId,
        method,
        amountRial: BigInt(parsed.data.amountRial),
        note: parsed.data.note,
        evidenceFileId: parsed.data.evidenceFileId ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
        idempotencyKey,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      response.status(
        result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED,
      );

      return this.formatPaymentAttemptResponse(result.paymentAttempt);
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
