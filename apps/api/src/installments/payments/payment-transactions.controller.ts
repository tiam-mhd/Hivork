import {
  ApplicationError,
  ListPaymentTransactionsUseCase,
  RefundPaymentUseCase,
  VoidLedgerTransactionUseCase,
} from '@hivork/application';
import {
  ListPaymentTransactionsQuerySchema,
  RefundPaymentBodySchema,
  RefundPaymentResponseSchema,
  VoidLedgerTransactionBodySchema,
  VoidLedgerTransactionResponseSchema,
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
  Param,
  Post,
  Query,
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
import { parseDateOnlyUtc, parseDateOnlyUtcEnd } from '../sales/sales.response.js';
import { parseResourceId, resolveBranchId, toStaffContext } from '../sales/sales.controller.helpers.js';

const idempotencyKeySchema = z.string().uuid();

/**
 * Payment transactions ledger API — IFP-103 list cursor-paginated entries.
 */
@Controller('v1/payments')
@RequireAuth('staff')
export class PaymentTransactionsController {
  constructor(
    private readonly listPaymentTransactions: ListPaymentTransactionsUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
    private readonly voidLedgerTransaction: VoidLedgerTransactionUseCase,
  ) {}

  /** GET /api/v1/payments/transactions */
  @Get('transactions')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.read')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListPaymentTransactionsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listPaymentTransactions.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        status: parsed.data.status,
        entryType: parsed.data.entryType,
        paymentMethod: parsed.data.paymentMethod,
        branchId: parsed.data.branchId,
        saleId: parsed.data.saleId,
        tenantCustomerId: parsed.data.tenantCustomerId,
        occurredFrom: parsed.data.occurredFrom
          ? parseDateOnlyUtc(parsed.data.occurredFrom)
          : undefined,
        occurredTo: parsed.data.occurredTo
          ? parseDateOnlyUtcEnd(parsed.data.occurredTo)
          : undefined,
        search: parsed.data.search,
        activeBranchId: staff.activeBranchId ?? undefined,
      });

      return {
        items: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
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

  /** POST /api/v1/payments/transactions/:ledgerEntryId/refund */
  @Post('transactions/:ledgerEntryId/refund')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.refund')
  @ApplyDataScope()
  async refund(
    @CurrentStaff() staff: StaffContext,
    @Param('ledgerEntryId') ledgerEntryIdParam: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ledgerEntryId = parseResourceId(ledgerEntryIdParam, 'Ledger entry id');
    const parsed = RefundPaymentBodySchema.safeParse(body);
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
      const result = await this.refundPayment.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        ledgerEntryId,
        refundAmountRial: BigInt(parsed.data.refundAmountRial),
        reason: parsed.data.reason,
        idempotencyKey,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      response.status(result.idempotentReplay ? HttpStatus.OK : HttpStatus.CREATED);

      const { idempotentReplay: _replay, ...payload } = result;
      return RefundPaymentResponseSchema.parse(payload);
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

  /** POST /api/v1/payments/transactions/:ledgerEntryId/void */
  @Post('transactions/:ledgerEntryId/void')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.payment.void')
  @ApplyDataScope()
  async voidLedger(
    @CurrentStaff() staff: StaffContext,
    @Param('ledgerEntryId') ledgerEntryIdParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const ledgerEntryId = parseResourceId(ledgerEntryIdParam, 'Ledger entry id');
    const parsed = VoidLedgerTransactionBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.voidLedgerTransaction.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        ledgerEntryId,
        voidReason: parsed.data.voidReason,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return VoidLedgerTransactionResponseSchema.parse(result);
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
