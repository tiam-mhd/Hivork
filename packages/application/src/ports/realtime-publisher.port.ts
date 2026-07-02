import type { RealtimeEventDto } from '@hivork/contracts/realtime';

export interface IRealtimePublisher {
  publish(tenantId: string, staffId: string, event: RealtimeEventDto): Promise<void>;
  publishToTenant(tenantId: string, event: RealtimeEventDto): Promise<void>;
}
