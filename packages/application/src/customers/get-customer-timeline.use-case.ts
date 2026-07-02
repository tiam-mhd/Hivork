import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type {
  CustomerTimelineEventRecord,
  CustomerTimelineEventType,
  ICustomerTimelineRepository,
} from '../ports/customer-timeline.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveEffectiveBranchIds } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import {
  decodeCustomerTimelineCursor,
  encodeCustomerTimelineCursor,
} from './customer-timeline-cursor.js';

export type GetCustomerTimelineInput = {
  tenantId: string;
  tenantCustomerId: string;
  limit?: number;
  cursor?: string;
  types?: CustomerTimelineEventType[];
  occurredFrom?: string;
  occurredTo?: string;
  staffContext: DataScopeStaffContext;
};

export type GetCustomerTimelineOutput = {
  items: Array<{
    id: string;
    type: CustomerTimelineEventType;
    occurredAt: string;
    title: string;
    summary: string | null;
    actor?: {
      type: 'staff' | 'customer' | 'system' | 'platform';
      id?: string;
      name?: string | null;
    };
    entityRef?: {
      type: string;
      id: string;
    };
    metadata?: Record<string, unknown> | null;
  }>;
  meta: {
    hasNext: boolean;
    nextCursor: string | null;
  };
};

type CallLogEntry = {
  id?: string;
  occurredAt?: string;
  summary?: string;
  direction?: string;
  loggedByStaffId?: string;
};

export class GetCustomerTimelineUseCase
  implements UseCase<GetCustomerTimelineInput, GetCustomerTimelineOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly timeline: ICustomerTimelineRepository,
  ) {}

  async execute(input: GetCustomerTimelineInput): Promise<GetCustomerTimelineOutput> {
    const limit = Math.min(input.limit ?? 20, 50);

    const customer = await this.tenantCustomers.findFullDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );
    if (!customer) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(
      customer,
      input.staffContext,
      input.staffContext.staffId,
      this.sales,
    );

    const cursor = input.cursor ? decodeCustomerTimelineCursor(input.cursor) : undefined;
    const occurredFrom = input.occurredFrom ? new Date(input.occurredFrom) : undefined;
    const occurredTo = input.occurredTo ? new Date(input.occurredTo) : undefined;

    if (occurredFrom && Number.isNaN(occurredFrom.getTime())) {
      throw new ApplicationError('VALIDATION_ERROR', 'occurredFrom is invalid.', 422);
    }
    if (occurredTo && Number.isNaN(occurredTo.getTime())) {
      throw new ApplicationError('VALIDATION_ERROR', 'occurredTo is invalid.', 422);
    }

    const includeCallType = !input.types?.length || input.types.includes('call');
    const callEvents = includeCallType ? this.parseCallLogEvents(customer.metadata) : [];

    const filteredCallEvents = this.applyFiltersToCallEvents(callEvents, {
      types: input.types,
      occurredFrom,
      occurredTo,
      cursor,
    });

    const fetchLimit = limit + filteredCallEvents.length + 1;

    const dbEvents = await this.timeline.listEvents({
      tenantId: input.tenantId,
      tenantCustomerId: input.tenantCustomerId,
      limit: fetchLimit,
      types: input.types,
      occurredFrom,
      occurredTo,
      cursor: cursor
        ? {
            occurredAt: new Date(cursor.occurredAt),
            id: cursor.id,
          }
        : undefined,
      scope: this.buildScope(input.staffContext),
    });

    const merged = [...dbEvents, ...filteredCallEvents]
      .sort((left, right) => {
        const timeDiff = right.occurredAt.getTime() - left.occurredAt.getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return right.id.localeCompare(left.id);
      })
      .slice(0, limit + 1);

    const hasNext = merged.length > limit;
    const pageItems = hasNext ? merged.slice(0, limit) : merged;
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems.map((item) => this.toDto(item)),
      meta: {
        hasNext,
        nextCursor:
          hasNext && lastItem
            ? encodeCustomerTimelineCursor({
                occurredAt: lastItem.occurredAt,
                id: lastItem.id,
              })
            : null,
      },
    };
  }

  private buildScope(staffContext: DataScopeStaffContext) {
    switch (staffContext.dataScope) {
      case 'all':
        return { dataScope: 'all' as const };
      case 'branch':
        return {
          dataScope: 'branch' as const,
          branchIds: resolveEffectiveBranchIds(staffContext),
        };
      case 'own':
        return { dataScope: 'own' as const, staffId: staffContext.staffId };
    }
  }

  private parseCallLogEvents(metadata: Record<string, unknown> | null | undefined) {
    if (!metadata || !Array.isArray(metadata.callLog)) {
      return [] as CustomerTimelineEventRecord[];
    }

    const events: CustomerTimelineEventRecord[] = [];

    for (const entry of metadata.callLog) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      const call = entry as CallLogEntry;
      if (!call.occurredAt || Number.isNaN(Date.parse(call.occurredAt))) {
        continue;
      }

      const callId = call.id ?? randomUUID();
      events.push({
        id: `call:${callId}`,
        type: 'call',
        occurredAt: new Date(call.occurredAt),
        title: 'تماس تلفنی (manual log)',
        summary: call.summary?.trim() || call.direction?.trim() || null,
        actorType: call.loggedByStaffId ? 'staff' : 'system',
        actorId: call.loggedByStaffId ?? null,
        actorName: null,
        entityType: 'tenant_customer',
        entityId: null,
        metadata: {
          direction: call.direction ?? null,
          source: 'tenant_customer.metadata.callLog',
        },
      });
    }

    return events;
  }

  private applyFiltersToCallEvents(
    events: CustomerTimelineEventRecord[],
    filters: {
      types?: CustomerTimelineEventType[];
      occurredFrom?: Date;
      occurredTo?: Date;
      cursor?: { occurredAt: string; id: string };
    },
  ) {
    return events.filter((event) => {
      if (filters.types?.length && !filters.types.includes(event.type)) {
        return false;
      }
      if (filters.occurredFrom && event.occurredAt < filters.occurredFrom) {
        return false;
      }
      if (filters.occurredTo && event.occurredAt > filters.occurredTo) {
        return false;
      }
      if (filters.cursor) {
        const cursorAt = new Date(filters.cursor.occurredAt);
        if (event.occurredAt > cursorAt) {
          return false;
        }
        if (
          event.occurredAt.getTime() === cursorAt.getTime() &&
          event.id >= filters.cursor.id
        ) {
          return false;
        }
      }
      return true;
    });
  }

  private toDto(item: CustomerTimelineEventRecord): GetCustomerTimelineOutput['items'][number] {
    return {
      id: item.id,
      type: item.type,
      occurredAt: item.occurredAt.toISOString(),
      title: item.title,
      summary: item.summary,
      actor: item.actorType
        ? {
            type: item.actorType,
            id: item.actorId ?? undefined,
            name: item.actorName,
          }
        : undefined,
      entityRef:
        item.entityType && item.entityId
          ? {
              type: item.entityType,
              id: item.entityId,
            }
          : undefined,
      metadata: item.metadata,
    };
  }
}
