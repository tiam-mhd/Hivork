import type { ListChecksResponseDto } from '@hivork/contracts/payments';
import { jalaliInputToIso, parseJalaliDateToIso, toWesternDigits } from '@hivork/i18n';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { CheckStatusValue, CheckTypeValue, ICheckRepository } from '../ports/check.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapCheckToSummary } from './check.mapper.js';

export type ListChecksInput = {
  tenantId: string;
  staffContext: DataScopeStaffContext;
  checkType?: 'received' | 'payable';
  status?: 'registered' | 'due' | 'collected' | 'bounced' | 'transferred' | 'cancelled';
  dueFrom?: string;
  dueTo?: string;
  cursor?: string;
  limit: number;
  activeBranchId?: string;
};

export type ListChecksResult = ListChecksResponseDto;

const CHECK_TYPE_TO_PRISMA: Record<NonNullable<ListChecksInput['checkType']>, CheckTypeValue> = {
  received: 'RECEIVED',
  payable: 'PAYABLE',
};

const CHECK_STATUS_TO_PRISMA: Record<
  NonNullable<ListChecksInput['status']>,
  CheckStatusValue
> = {
  registered: 'REGISTERED',
  due: 'DUE',
  collected: 'COLLECTED',
  bounced: 'BOUNCED',
  transferred: 'TRANSFERRED',
  cancelled: 'CANCELLED',
};

function parseJalaliDateStart(value: string): Date | null {
  const normalized = toWesternDigits(value).trim();
  const dashMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  const iso = dashMatch
    ? jalaliInputToIso(Number(dashMatch[1]), Number(dashMatch[2]), Number(dashMatch[3]))
    : parseJalaliDateToIso(normalized);

  if (!iso) {
    return null;
  }

  return new Date(`${iso}T00:00:00.000Z`);
}

function parseJalaliDateEnd(value: string): Date | null {
  const normalized = toWesternDigits(value).trim();
  const dashMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  const iso = dashMatch
    ? jalaliInputToIso(Number(dashMatch[1]), Number(dashMatch[2]), Number(dashMatch[3]))
    : parseJalaliDateToIso(normalized);

  if (!iso) {
    return null;
  }

  return new Date(`${iso}T23:59:59.999Z`);
}

export class ListChecksUseCase implements UseCase<ListChecksInput, ListChecksResult> {
  constructor(private readonly checks: ICheckRepository) {}

  async execute(input: ListChecksInput): Promise<ListChecksResult> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const dueFrom = input.dueFrom ? parseJalaliDateStart(input.dueFrom) : undefined;
    if (input.dueFrom && !dueFrom) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid dueFrom date.', 400);
    }

    const dueTo = input.dueTo ? parseJalaliDateEnd(input.dueTo) : undefined;
    if (input.dueTo && !dueTo) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid dueTo date.', 400);
    }

    const branchIds = this.resolveBranchIds(input);
    const cursorPayload = input.cursor ? decodeCheckCursor(input.cursor) : undefined;

    const result = await this.checks.list(input.tenantId, {
      branchIds,
      checkType: input.checkType ? CHECK_TYPE_TO_PRISMA[input.checkType] : undefined,
      status: input.status ? CHECK_STATUS_TO_PRISMA[input.status] : undefined,
      ...(dueFrom ? { dueFrom } : {}),
      ...(dueTo ? { dueTo } : {}),
      limit: input.limit,
      cursor: cursorPayload,
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeCheckCursor(lastItem.createdAt, lastItem.id)
        : null;

    return {
      items: result.items.map(mapCheckToSummary),
      nextCursor,
      hasMore: result.hasMore,
    };
  }

  private resolveBranchIds(input: ListChecksInput): string[] | undefined {
    if (input.staffContext.dataScope === 'all') {
      return input.activeBranchId ? [input.activeBranchId] : undefined;
    }

    const effective = resolveEffectiveBranchIds(input.staffContext);
    return effective.length > 0 ? effective : undefined;
  }
}

function encodeCheckCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

function decodeCheckCursor(cursor: string): { createdAt: Date; id: string } {
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
