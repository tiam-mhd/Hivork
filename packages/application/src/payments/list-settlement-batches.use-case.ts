import type { SettlementBatchSummaryDto } from '@hivork/contracts/payments';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ISettlementBatchRepository } from '../ports/settlement-batch.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapSettlementBatchToSummary } from './settlement.mapper.js';

export type ListSettlementBatchesInput = {
  tenantId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  status?: 'open' | 'closed';
  cursor?: string;
  limit: number;
  activeBranchId?: string;
};

export type ListSettlementBatchesResult = {
  items: SettlementBatchSummaryDto[];
  nextCursor: string | null;
  hasMore: boolean;
};

const STATUS_TO_PRISMA = {
  open: 'OPEN',
  closed: 'CLOSED',
} as const;

export class ListSettlementBatchesUseCase
  implements UseCase<ListSettlementBatchesInput, ListSettlementBatchesResult>
{
  constructor(private readonly settlements: ISettlementBatchRepository) {}

  async execute(input: ListSettlementBatchesInput): Promise<ListSettlementBatchesResult> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const branchIds = this.resolveBranchIds(input);
    const cursorPayload = input.cursor ? decodeSettlementCursor(input.cursor) : undefined;

    const result = await this.settlements.list(input.tenantId, {
      branchIds,
      status: input.status ? STATUS_TO_PRISMA[input.status] : undefined,
      limit: input.limit,
      cursor: cursorPayload,
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeSettlementCursor(lastItem.createdAt, lastItem.id)
        : null;

    return {
      items: result.items.map(mapSettlementBatchToSummary),
      nextCursor,
      hasMore: result.hasMore,
    };
  }

  private resolveBranchIds(input: ListSettlementBatchesInput): string[] | undefined {
    if (input.branchId) {
      if (input.staffContext.dataScope !== 'all') {
        const effective = resolveEffectiveBranchIds(input.staffContext);
        if (effective.length > 0 && !effective.includes(input.branchId)) {
          return ['00000000-0000-0000-0000-000000000000'];
        }
      }
      return [input.branchId];
    }

    if (input.staffContext.dataScope === 'all') {
      return input.activeBranchId ? [input.activeBranchId] : undefined;
    }

    const effective = resolveEffectiveBranchIds(input.staffContext);
    return effective.length > 0 ? effective : undefined;
  }
}

function encodeSettlementCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

function decodeSettlementCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt: string;
      id: string;
    };
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw new ApplicationError('VALIDATION_ERROR', 'Invalid cursor.', 400);
  }
}
