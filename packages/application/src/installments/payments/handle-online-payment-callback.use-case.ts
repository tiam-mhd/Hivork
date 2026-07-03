import { PaymentReportedEvent } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IPaymentGatewayRegistry } from '../../ports/payment-gateway.port.js';
import type { IPaymentAttemptRepository } from '../../ports/payment-attempt.repository.port.js';
import type { IOutboxPublisher } from '../../ports/outbox.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  isOnlinePaymentSessionExpired,
  mapPaymentAttemptToDetail,
  resolvePaymentRecordingSettings,
  type PaymentAttemptDetailResult,
} from './record-payment.helper.js';

export type HandleOnlinePaymentCallbackInput = {
  provider: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  ip?: string;
  userAgent?: string;
};

export type HandleOnlinePaymentCallbackResult = {
  paymentAttempt: PaymentAttemptDetailResult;
  idempotentReplay: boolean;
  autoConfirmSkipped: boolean;
};

export class HandleOnlinePaymentCallbackUseCase
  implements UseCase<HandleOnlinePaymentCallbackInput, HandleOnlinePaymentCallbackResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly gateways: IPaymentGatewayRegistry,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
  ) {}

  async execute(
    input: HandleOnlinePaymentCallbackInput,
  ): Promise<HandleOnlinePaymentCallbackResult> {
    const gateway = this.gateways.get(input.provider);
    if (!gateway) {
      throw new ApplicationError('GATEWAY_UNAVAILABLE', 'Payment gateway is not configured.', 502);
    }

    let payload;
    try {
      payload = gateway.verifyWebhook(input.headers, input.body);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_WEBHOOK_SIGNATURE') {
        throw new ApplicationError(
          'WEBHOOK_SIGNATURE_INVALID',
          'Invalid payment gateway signature.',
          401,
        );
      }

      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Invalid payment gateway webhook payload.',
        400,
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      const attempt = await this.paymentAttempts.findByIdGlobal(payload.referenceId, tx);
      if (!attempt) {
        throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
      }

      const duplicateByTransaction = await this.paymentAttempts.findByGatewayTransactionId(
        attempt.tenantId,
        payload.gateway,
        payload.transactionId,
        tx,
      );

      if (duplicateByTransaction) {
        return {
          paymentAttempt: mapPaymentAttemptToDetail(duplicateByTransaction),
          idempotentReplay: true,
          autoConfirmSkipped: true,
        };
      }

      const metadata = attempt.metadata ?? {};
      const existingTransactionId =
        typeof metadata.gatewayTransactionId === 'string' ? metadata.gatewayTransactionId : null;

      if (existingTransactionId === payload.transactionId) {
        return {
          paymentAttempt: mapPaymentAttemptToDetail(attempt),
          idempotentReplay: true,
          autoConfirmSkipped: true,
        };
      }

      if (isOnlinePaymentSessionExpired(metadata)) {
        throw new ApplicationError(
          'PAYMENT_SESSION_EXPIRED',
          'Online payment session has expired.',
          410,
        );
      }

      if (payload.amountRial !== attempt.amountRial) {
        throw new ApplicationError(
          'AMOUNT_MISMATCH',
          'Gateway callback amount does not match the payment attempt.',
          409,
        );
      }

      if (payload.status === 'failed') {
        const updated = await this.paymentAttempts.updateMetadata(
          {
            tenantId: attempt.tenantId,
            id: attempt.id,
            metadataPatch: {
              callbackStatus: 'failed',
              gatewayTransactionId: payload.transactionId,
              callbackReceivedAt: new Date().toISOString(),
            },
          },
          tx,
        );

        return {
          paymentAttempt: mapPaymentAttemptToDetail(updated!),
          idempotentReplay: false,
          autoConfirmSkipped: true,
        };
      }

      const updated = await this.paymentAttempts.updateMetadata(
        {
          tenantId: attempt.tenantId,
          id: attempt.id,
          metadataPatch: {
            callbackStatus: 'success',
            gatewayTransactionId: payload.transactionId,
            cardMask: payload.cardMask ?? null,
            callbackReceivedAt: new Date().toISOString(),
          },
        },
        tx,
      );

      if (!updated) {
        throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
      }

      await this.audit.log(
        {
          tenantId: attempt.tenantId,
          actorType: 'system',
          actorId: 'payment-gateway',
          action: 'payment.report',
          entityType: 'payment_attempt',
          entityId: updated.id,
          newValue: {
            installmentId: updated.installmentId,
            amountRial: updated.amountRial.toString(),
            method: 'online',
            gateway: payload.gateway,
            gatewayTransactionId: payload.transactionId,
            status: 'pending',
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      await this.outbox.publish(
        new PaymentReportedEvent(updated.id, {
          tenantId: attempt.tenantId,
          installmentId: updated.installmentId,
          paymentAttemptId: updated.id,
          amountRial: updated.amountRial.toString(),
          method: 'online',
          reportedByType: 'staff',
        }),
        { tenantId: attempt.tenantId, aggregateType: 'payment_attempt' },
        tx,
      );

      const settings = await this.tenantSettings.findByModule(attempt.tenantId, 'installments', tx);
      const paymentSettings = resolvePaymentRecordingSettings(settings);
      const autoConfirmSkipped = !paymentSettings.autoConfirmOnline;

      return {
        paymentAttempt: mapPaymentAttemptToDetail(updated),
        idempotentReplay: false,
        autoConfirmSkipped,
      };
    });
  }
}
