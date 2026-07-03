import type { CreateUnifiedPaymentDto, UnifiedPaymentResponseDto } from '@hivork/contracts/payments';

import { UseCase } from '../core/use-case.js';
import type { InitOnlinePaymentUseCase } from '../installments/payments/init-online-payment.use-case.js';
import type { RecordBankTransferPaymentUseCase } from '../installments/payments/record-bank-transfer-payment.use-case.js';
import type { RecordCashManualPaymentUseCase } from '../installments/payments/record-cash-manual-payment.use-case.js';
import type { RecordCheckPaymentUseCase } from '../installments/payments/record-check-payment.use-case.js';
import type { RecordPosPaymentUseCase } from '../installments/payments/record-pos-payment.use-case.js';
import { mapPaymentAttemptToDetail } from '../installments/payments/record-payment.helper.js';
import type { IPaymentAttemptRepository } from '../ports/payment-attempt.repository.port.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import {
  assertPaymentMethodAvailable,
  loadPaymentMethodListItems,
} from './payment-method-settings.helper.js';
import { mapToUnifiedPaymentResponse } from './unified-payment.mapper.js';
import type { WalletPaymentUseCase } from './wallet-payment.use-case.js';

type WithBigIntAmount<T extends { amountRial: string }> = Omit<T, 'amountRial'> & {
  amountRial: bigint;
};

export type CreateUnifiedPaymentBody =
  | WithBigIntAmount<Extract<CreateUnifiedPaymentDto, { method: 'cash' }>>
  | WithBigIntAmount<Extract<CreateUnifiedPaymentDto, { method: 'in_person' }>>
  | WithBigIntAmount<Extract<CreateUnifiedPaymentDto, { method: 'bank_transfer' }>>
  | WithBigIntAmount<Extract<CreateUnifiedPaymentDto, { method: 'card' }>>
  | WithBigIntAmount<Extract<CreateUnifiedPaymentDto, { method: 'online' }>>
  | WithBigIntAmount<Extract<CreateUnifiedPaymentDto, { method: 'check' }>>
  | WithBigIntAmount<Extract<CreateUnifiedPaymentDto, { method: 'wallet' }>>;

export type CreateUnifiedPaymentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  idempotencyKey: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
  body: CreateUnifiedPaymentBody;
};

export type CreateUnifiedPaymentResult = UnifiedPaymentResponseDto & {
  idempotentReplay: boolean;
};

type DispatchContext = Omit<CreateUnifiedPaymentInput, 'body'>;

export class CreateUnifiedPaymentUseCase
  implements UseCase<CreateUnifiedPaymentInput, CreateUnifiedPaymentResult>
{
  constructor(
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly recordCashManualPayment: RecordCashManualPaymentUseCase,
    private readonly recordBankTransferPayment: RecordBankTransferPaymentUseCase,
    private readonly recordPosPayment: RecordPosPaymentUseCase,
    private readonly recordCheckPayment: RecordCheckPaymentUseCase,
    private readonly initOnlinePayment: InitOnlinePaymentUseCase,
    private readonly walletPayment: WalletPaymentUseCase,
  ) {}

  async execute(input: CreateUnifiedPaymentInput): Promise<CreateUnifiedPaymentResult> {
    const methods = await loadPaymentMethodListItems(
      this.tenantSettings,
      this.tenantPlans,
      input.tenantId,
    );

    assertPaymentMethodAvailable(methods, input.body.method);

    const ctx: DispatchContext = {
      tenantId: input.tenantId,
      branchId: input.branchId,
      staffId: input.staffId,
      idempotencyKey: input.idempotencyKey,
      staffContext: input.staffContext,
      ip: input.ip,
      userAgent: input.userAgent,
    };

    switch (input.body.method) {
      case 'cash':
        return this.dispatchCashManual(ctx, input.body, 'cash');
      case 'in_person':
        return this.dispatchCashManual(ctx, input.body, 'in_person');
      case 'bank_transfer':
        return this.dispatchBankTransfer(ctx, input.body);
      case 'card':
        return this.dispatchCard(ctx, input.body);
      case 'check':
        return this.dispatchCheck(ctx, input.body);
      case 'online':
        return this.dispatchOnline(ctx, input.body);
      case 'wallet':
        return this.dispatchWallet(ctx, input.body);
      default: {
        const _exhaustive: never = input.body;
        throw _exhaustive;
      }
    }
  }

  private async dispatchCashManual(
    ctx: DispatchContext,
    body: Extract<CreateUnifiedPaymentBody, { method: 'cash' | 'in_person' }>,
    unifiedMethod: 'cash' | 'in_person',
  ): Promise<CreateUnifiedPaymentResult> {
    const result = await this.recordCashManualPayment.execute({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
      installmentId: body.installmentId,
      method: unifiedMethod === 'in_person' ? 'manual' : 'cash',
      amountRial: body.amountRial,
      note: body.note,
      paidAt:
        unifiedMethod === 'in_person' && body.method === 'in_person'
          ? new Date(body.receivedAt)
          : undefined,
      idempotencyKey: ctx.idempotencyKey,
      staffContext: ctx.staffContext,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      ...mapToUnifiedPaymentResponse({
        paymentAttempt: result.paymentAttempt,
        unifiedMethod,
      }),
      idempotentReplay: result.idempotentReplay,
    };
  }

  private async dispatchBankTransfer(
    ctx: DispatchContext,
    body: Extract<CreateUnifiedPaymentBody, { method: 'bank_transfer' }>,
  ): Promise<CreateUnifiedPaymentResult> {
    const result = await this.recordBankTransferPayment.execute({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
      installmentId: body.installmentId,
      amountRial: body.amountRial,
      bankName: body.bankName,
      referenceNumber: body.referenceNumber,
      transferDate: body.transferDate,
      accountLast4: body.accountLast4,
      note: body.note,
      idempotencyKey: ctx.idempotencyKey,
      staffContext: ctx.staffContext,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      ...mapToUnifiedPaymentResponse({
        paymentAttempt: result.paymentAttempt,
        unifiedMethod: 'bank_transfer',
      }),
      idempotentReplay: result.idempotentReplay,
    };
  }

  private async dispatchCard(
    ctx: DispatchContext,
    body: Extract<CreateUnifiedPaymentBody, { method: 'card' }>,
  ): Promise<CreateUnifiedPaymentResult> {
    const result = await this.recordPosPayment.execute({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
      installmentId: body.installmentId,
      amountRial: body.amountRial,
      terminalId: body.terminalId,
      traceNumber: body.traceNumber,
      cardLast4: body.cardLast4,
      batchNumber: body.batchNumber,
      note: body.note,
      idempotencyKey: ctx.idempotencyKey,
      staffContext: ctx.staffContext,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      ...mapToUnifiedPaymentResponse({
        paymentAttempt: result.paymentAttempt,
        unifiedMethod: 'card',
      }),
      idempotentReplay: result.idempotentReplay,
    };
  }

  private async dispatchCheck(
    ctx: DispatchContext,
    body: Extract<CreateUnifiedPaymentBody, { method: 'check' }>,
  ): Promise<CreateUnifiedPaymentResult> {
    const result = await this.recordCheckPayment.execute({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
      installmentId: body.installmentId,
      amountRial: body.amountRial,
      checkNumber: body.checkNumber,
      bankName: body.bankName,
      dueDate: body.dueDate,
      drawerName: body.drawerName,
      branchCode: body.branchCode,
      sayadId: body.sayadId,
      note: body.note,
      idempotencyKey: ctx.idempotencyKey,
      staffContext: ctx.staffContext,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      ...mapToUnifiedPaymentResponse({
        paymentAttempt: result.paymentAttempt,
        unifiedMethod: 'check',
      }),
      idempotentReplay: result.idempotentReplay,
    };
  }

  private async dispatchOnline(
    ctx: DispatchContext,
    body: Extract<CreateUnifiedPaymentBody, { method: 'online' }>,
  ): Promise<CreateUnifiedPaymentResult> {
    const result = await this.initOnlinePayment.execute({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
      installmentId: body.installmentId,
      amountRial: body.amountRial,
      returnUrl: body.returnUrl,
      idempotencyKey: ctx.idempotencyKey,
      staffContext: ctx.staffContext,
    });

    const attempt = await this.paymentAttempts.findById(
      ctx.tenantId,
      result.paymentAttemptId,
    );

    if (!attempt) {
      throw new Error(`Payment attempt not found after online init: ${result.paymentAttemptId}`);
    }

    return {
      ...mapToUnifiedPaymentResponse({
        paymentAttempt: mapPaymentAttemptToDetail(attempt),
        unifiedMethod: 'online',
        redirectUrl: result.redirectUrl,
      }),
      idempotentReplay: result.idempotentReplay,
    };
  }

  private async dispatchWallet(
    ctx: DispatchContext,
    body: Extract<CreateUnifiedPaymentBody, { method: 'wallet' }>,
  ): Promise<CreateUnifiedPaymentResult> {
    await this.walletPayment.execute({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
      installmentId: body.installmentId,
      amountRial: body.amountRial,
      walletProvider: body.walletProvider,
      idempotencyKey: ctx.idempotencyKey,
      staffContext: ctx.staffContext,
    });

    throw new Error('WalletPaymentUseCase must throw before returning.');
  }
}
