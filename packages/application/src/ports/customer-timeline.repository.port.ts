export type CustomerTimelineEventType =
  | 'payment'
  | 'contract'
  | 'sms'
  | 'notification'
  | 'note'
  | 'call'
  | 'audit';

export type CustomerTimelineScopeFilter =
  | { dataScope: 'all' }
  | { dataScope: 'branch'; branchIds: string[] }
  | { dataScope: 'own'; staffId: string };

export type CustomerTimelineEventRecord = {
  id: string;
  type: CustomerTimelineEventType;
  occurredAt: Date;
  title: string;
  summary: string | null;
  actorType: 'staff' | 'customer' | 'system' | 'platform' | null;
  actorId: string | null;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
};

export type ListCustomerTimelineOptions = {
  tenantId: string;
  tenantCustomerId: string;
  limit: number;
  types?: CustomerTimelineEventType[];
  occurredFrom?: Date;
  occurredTo?: Date;
  cursor?: {
    occurredAt: Date;
    id: string;
  };
  scope: CustomerTimelineScopeFilter;
};

export interface ICustomerTimelineRepository {
  listEvents(options: ListCustomerTimelineOptions): Promise<CustomerTimelineEventRecord[]>;
}
