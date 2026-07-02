import {
  applyScoreDelta,
  adjustOverdueCount,
  buildAutoBlacklistReason,
  hasScoringEventProcessed,
  markScoringEventProcessed,
  parseAutoBlacklistThreshold,
  parseCustomerScoringWeights,
  scoreDeltaForEvent,
  shouldAutoBlacklist,
} from '@hivork/domain';

import type { ITenantCustomerRepository } from '../../ports/tenant-customer.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type {
  IOutboxEventHandler,
  OutboxEventDispatchRecord,
} from '../../ports/outbox-event-handler.port.js';

const SUPPORTED_EVENTS = new Set(['payment.confirmed', 'installment.overdue']);

export class CustomerScoringHandler implements IOutboxEventHandler {
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly settings: ITenantSettingsRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  supports(eventType: string): boolean {
    return SUPPORTED_EVENTS.has(eventType);
  }

  async handle(event: OutboxEventDispatchRecord): Promise<void> {
    if (event.eventType === 'payment.confirmed') {
      await this.onPaymentConfirmed(event);
      return;
    }

    if (event.eventType === 'installment.overdue') {
      await this.onInstallmentOverdue(event);
    }
  }

  private async onPaymentConfirmed(event: OutboxEventDispatchRecord): Promise<void> {
    const tenantId = readString(event.payload.tenantId) ?? event.tenantId;
    const tenantCustomerId = readString(event.payload.tenantCustomerId);
    const wasOverdueInstallment = event.payload.wasOverdueInstallment === true;

    if (!tenantId || !tenantCustomerId) {
      return;
    }

    await this.applyScoringUpdate({
      outboxEventId: event.id,
      tenantId,
      tenantCustomerId,
      scoreKind: 'payment_confirmed',
      overdueEvent: wasOverdueInstallment ? 'paid' : 'waived',
    });
  }

  private async onInstallmentOverdue(event: OutboxEventDispatchRecord): Promise<void> {
    const tenantId = readString(event.payload.tenantId) ?? event.tenantId;
    const tenantCustomerId = readString(event.payload.tenantCustomerId);

    if (!tenantId || !tenantCustomerId) {
      return;
    }

    await this.applyScoringUpdate({
      outboxEventId: event.id,
      tenantId,
      tenantCustomerId,
      scoreKind: 'installment_overdue',
      overdueEvent: 'overdue',
    });
  }

  private async applyScoringUpdate(params: {
    outboxEventId: string;
    tenantId: string;
    tenantCustomerId: string;
    scoreKind: 'payment_confirmed' | 'installment_overdue';
    overdueEvent: 'overdue' | 'paid' | 'waived';
  }): Promise<void> {
    const customer = await this.tenantCustomers.findFullDetailById(
      params.tenantCustomerId,
      params.tenantId,
    );

    if (!customer) {
      return;
    }

    if (hasScoringEventProcessed(customer.metadata, params.outboxEventId)) {
      return;
    }

    const settings = await this.settings.findByModule(params.tenantId, 'installments');
    const weights = parseCustomerScoringWeights(settings);
    const autoBlacklistThreshold = parseAutoBlacklistThreshold(settings);

    const delta = scoreDeltaForEvent(params.scoreKind, weights);
    const creditScore = applyScoreDelta(customer.creditScore, delta);
    const overdueCount = adjustOverdueCount(customer.overdueCount, params.overdueEvent);
    const metadata = markScoringEventProcessed(customer.metadata, params.outboxEventId);

    const autoBlacklist =
      !customer.isBlacklisted &&
      shouldAutoBlacklist(creditScore, autoBlacklistThreshold) &&
      autoBlacklistThreshold !== null;

    await this.unitOfWork.transaction(async (tx) => {
      await this.tenantCustomers.updateLink(
        {
          id: customer.id,
          tenantId: params.tenantId,
          version: customer.version,
          updatedById: null,
          creditScore,
          overdueCount,
          metadata,
          ...(autoBlacklist
            ? {
                isBlacklisted: true,
                blacklistReason: buildAutoBlacklistReason(creditScore, autoBlacklistThreshold),
              }
            : {}),
        },
        tx,
      );
    });
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
