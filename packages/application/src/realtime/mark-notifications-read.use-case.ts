import { UseCase } from '../core/use-case.js';
import type { IRealtimeUnreadCounter } from '../ports/realtime-unread-counter.port.js';

export type MarkNotificationsReadInput = {
  tenantId: string;
  staffId: string;
};

export class MarkNotificationsReadUseCase implements UseCase<MarkNotificationsReadInput, void> {
  constructor(private readonly unreadCounter: IRealtimeUnreadCounter) {}

  async execute(input: MarkNotificationsReadInput): Promise<void> {
    await this.unreadCounter.reset(input.tenantId, input.staffId);
  }
}
