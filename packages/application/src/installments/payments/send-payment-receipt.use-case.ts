import { normalizePhone } from '@hivork/contracts';

import { formatRialAsTomanDisplay } from '../../core/export/export-money.js';
import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import {
  buildReceiptSendIdempotencyKey,
  type INotificationDispatcher,
  type ReceiptNotificationChannel,
} from '../../ports/notification-dispatcher.port.js';
import type { IPaymentAttemptRepository } from '../../ports/payment-attempt.repository.port.js';
import type { IPaymentReceiptRepository } from '../../ports/payment-receipt.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { ITenantRepository } from '../../ports/tenant.repository.port.js';
import type { ITenantSequenceRepository } from '../../ports/tenant-sequence.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { mergeInstallmentsSettings } from '../settings/merge-installments-settings.js';
import { loadPaymentReceiptContext } from './payment-receipt-context.loader.js';
import { resolveOrCreatePaymentReceiptNumber } from './resolve-payment-receipt-number.js';

export type SendPaymentReceiptInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  paymentAttemptId: string;
  channels: ReceiptNotificationChannel[];
  recipientPhone?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type SendPaymentReceiptDispatchItem = {
  channel: ReceiptNotificationChannel;
  status: 'queued' | 'skipped';
  notificationLogId: string;
};

export type SendPaymentReceiptResult = {
  receiptNumber: string;
  dispatched: SendPaymentReceiptDispatchItem[];
  idempotent: boolean;
};

export class SendPaymentReceiptUseCase
  implements UseCase<SendPaymentReceiptInput, SendPaymentReceiptResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly installments: IInstallmentRepository,
    private readonly sales: ISaleRepository,
    private readonly staff: IStaffRepository,
    private readonly tenants: ITenantRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly paymentReceipts: IPaymentReceiptRepository,
    private readonly sequences: ITenantSequenceRepository,
    private readonly notifications: INotificationDispatcher,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SendPaymentReceiptInput): Promise<SendPaymentReceiptResult> {
    if (input.channels.length === 0) {
      throw new ApplicationError('VALIDATION_ERROR', 'At least one channel is required.', 400);
    }

    const context = await loadPaymentReceiptContext({
      tenantId: input.tenantId,
      branchId: input.branchId,
      staffId: input.staffId,
      paymentAttemptId: input.paymentAttemptId,
      staffContext: input.staffContext,
      paymentAttempts: this.paymentAttempts,
      installments: this.installments,
      sales: this.sales,
      staff: this.staff,
      tenants: this.tenants,
      branches: this.branches,
    });

    const tenantRecord = await this.tenants.findById(input.tenantId);
    if (!tenantRecord) {
      throw new ApplicationError('TENANT_NOT_FOUND', 'Tenant was not found.', 404);
    }

    const settingsRaw = await this.tenantSettings.findByModule(input.tenantId, 'installments');
    const settings = mergeInstallmentsSettings(settingsRaw);
    const enabledChannels = new Set(settings.default_reminder_channels);

    for (const channel of input.channels) {
      if (!enabledChannels.has(channel)) {
        throw new ApplicationError(
          'CHANNEL_DISABLED',
          `Channel "${channel}" is disabled for this tenant.`,
          400,
        );
      }
    }

    let recipientPhone: string;
    try {
      recipientPhone = normalizePhone(input.recipientPhone ?? context.customerPhone);
    } catch {
      throw new ApplicationError(
        'RECIPIENT_UNAVAILABLE',
        'Customer phone is unavailable for receipt delivery.',
        400,
      );
    }

    const referenceDate = context.attempt.confirmedAt ?? new Date();

    return this.unitOfWork.transaction(async (tx) => {
      const resolved = await resolveOrCreatePaymentReceiptNumber({
        tenantId: input.tenantId,
        tenantSlug: tenantRecord.slug,
        paymentAttemptId: context.attempt.id,
        referenceDate,
        createdById: input.staffId,
        paymentReceipts: this.paymentReceipts,
        sequences: this.sequences,
        tx,
      });

      const dispatched: SendPaymentReceiptDispatchItem[] = [];
      let queuedAny = false;

      const amountLabel = formatRialAsTomanDisplay(context.attempt.amountRial);
      const message = `رسید پرداخت ${resolved.receiptNumber} — ${amountLabel} — ${context.tenantBranding.name}`;

      for (const channel of input.channels) {
        const idempotencyKey = buildReceiptSendIdempotencyKey(context.attempt.id, channel);
        const result = await this.notifications.queue({
          tenantId: input.tenantId,
          installmentId: context.installment.id,
          channel,
          recipientRef: recipientPhone,
          idempotencyKey,
          createdById: input.staffId,
          metadata: {
            paymentAttemptId: context.attempt.id,
            receiptNumber: resolved.receiptNumber,
            message,
            maskedRecipient: maskRecipientForAudit(recipientPhone),
          },
        });

        if (result.status === 'queued') {
          queuedAny = true;
        }

        dispatched.push({
          channel,
          status: result.status,
          notificationLogId: result.notificationLogId,
        });
      }

      if (queuedAny) {
        await this.paymentReceipts.markSent(
          input.tenantId,
          resolved.receiptId,
          new Date(),
          input.staffId,
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'receipt.send',
            entityType: 'payment_attempt',
            entityId: context.attempt.id,
            newValue: {
              receiptNumber: resolved.receiptNumber,
              channels: input.channels,
              maskedRecipient: maskRecipientForAudit(recipientPhone),
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );
      }

      return {
        receiptNumber: resolved.receiptNumber,
        dispatched,
        idempotent: !queuedAny,
      };
    });
  }
}

function maskRecipientForAudit(phone: string): string {
  if (phone.length < 4) {
    return '****';
  }

  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}
