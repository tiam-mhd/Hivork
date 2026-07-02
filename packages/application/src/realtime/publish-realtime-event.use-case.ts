import type { RealtimeEventDto } from '@hivork/contracts/realtime';
import { RealtimeEventSchema } from '@hivork/contracts/realtime';

import { UseCase } from '../core/use-case.js';
import type { IRealtimePublisher } from '../ports/realtime-publisher.port.js';
import type { IRealtimeUnreadCounter } from '../ports/realtime-unread-counter.port.js';

export type PublishRealtimeEventInput = {
  tenantId: string;
  staffId: string;
  event: RealtimeEventDto;
  incrementUnread?: boolean;
};

export class PublishRealtimeEventUseCase
  implements UseCase<PublishRealtimeEventInput, void>
{
  constructor(
    private readonly publisher: IRealtimePublisher,
    private readonly unreadCounter: IRealtimeUnreadCounter,
  ) {}

  async execute(input: PublishRealtimeEventInput): Promise<void> {
    const event = RealtimeEventSchema.parse(input.event);
    await this.publisher.publish(input.tenantId, input.staffId, event);
    if (input.incrementUnread !== false) {
      await this.unreadCounter.increment(input.tenantId, input.staffId);
    }
  }
}
