import type { NotificationUnreadCountDto } from '@hivork/contracts/realtime';

import { UseCase } from '../core/use-case.js';
import type { IRealtimeUnreadCounter } from '../ports/realtime-unread-counter.port.js';

export type GetNotificationUnreadCountInput = {
  tenantId: string;
  staffId: string;
};

export class GetNotificationUnreadCountUseCase
  implements UseCase<GetNotificationUnreadCountInput, NotificationUnreadCountDto>
{
  constructor(private readonly unreadCounter: IRealtimeUnreadCounter) {}

  async execute(input: GetNotificationUnreadCountInput): Promise<NotificationUnreadCountDto> {
    const unreadCount = await this.unreadCounter.get(input.tenantId, input.staffId);
    return { unreadCount };
  }
}
