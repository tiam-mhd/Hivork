import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type {
  IStaffRepository,
  StaffListItem,
  StaffListSort,
} from '../ports/staff.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { buildStaffListScope } from './staff-data-scope.js';
import { decodeStaffCursor, encodeStaffCursor } from './staff-cursor.js';

export type ListStaffInput = {
  tenantId: string;
  cursor?: string;
  limit?: number;
  sort?: StaffListSort;
  status?: 'active' | 'suspended';
  branchId?: string;
  search?: string;
  staffContext: DataScopeStaffContext;
};

export type ListStaffOutput = {
  data: StaffListItem[];
  meta: {
    total: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
};

const ALLOWED_SORTS: StaffListSort[] = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
];

export class ListStaffUseCase implements UseCase<ListStaffInput, ListStaffOutput> {
  constructor(private readonly staff: IStaffRepository) {}

  async execute(input: ListStaffInput): Promise<ListStaffOutput> {
    const limit = input.limit ?? 20;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const sort = input.sort ?? 'createdAt:desc';
    if (!ALLOWED_SORTS.includes(sort)) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid sort field.', 400);
    }

    const scope = buildStaffListScope(input.staffContext);
    if (scope.dataScope === 'branch' && scope.branchIds.length === 0) {
      return { data: [], meta: { total: 0, hasNext: false, nextCursor: null } };
    }

    const cursorPayload = input.cursor ? decodeStaffCursor(input.cursor, sort) : undefined;

    const result = await this.staff.listActive(input.tenantId, {
      cursor: cursorPayload
        ? {
            id: cursorPayload.id,
            createdAt: new Date(cursorPayload.createdAt),
            name: cursorPayload.name,
          }
        : undefined,
      limit,
      sort,
      status: input.status,
      branchId: input.branchId,
      search: input.search?.trim() || undefined,
      scope,
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeStaffCursor(sort, lastItem.createdAt, lastItem.id, lastItem.name)
        : null;

    return {
      data: result.items,
      meta: {
        total: result.total,
        hasNext: result.hasMore,
        nextCursor,
      },
    };
  }
}
