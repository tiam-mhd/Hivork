import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type {
  BranchListItem,
  BranchListSort,
  IBranchRepository,
} from '../ports/branch.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { buildBranchListScope } from './branch-data-scope.js';
import { decodeBranchCursor, encodeBranchCursor } from './branch-cursor.js';

export type ListBranchesInput = {
  tenantId: string;
  cursor?: string;
  limit?: number;
  sort?: BranchListSort;
  isActive?: boolean;
  staffContext: DataScopeStaffContext;
};

export type ListBranchesOutput = {
  data: BranchListItem[];
  meta: {
    total: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
};

const ALLOWED_SORTS: BranchListSort[] = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
];

export class ListBranchesUseCase implements UseCase<ListBranchesInput, ListBranchesOutput> {
  constructor(private readonly branches: IBranchRepository) {}

  async execute(input: ListBranchesInput): Promise<ListBranchesOutput> {
    const limit = input.limit ?? 20;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const sort = input.sort ?? 'createdAt:desc';
    if (!ALLOWED_SORTS.includes(sort)) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid sort field.', 400);
    }

    const scope = buildBranchListScope(input.staffContext);
    if (
      scope.dataScope !== 'all' &&
      (!scope.branchIds || scope.branchIds.length === 0)
    ) {
      return { data: [], meta: { total: 0, hasNext: false, nextCursor: null } };
    }

    const cursorPayload = input.cursor ? decodeBranchCursor(input.cursor, sort) : undefined;

    const result = await this.branches.listActive(input.tenantId, {
      cursor: cursorPayload
        ? {
            id: cursorPayload.id,
            createdAt: new Date(cursorPayload.createdAt),
            name: cursorPayload.name,
          }
        : undefined,
      limit,
      sort,
      isActive: input.isActive,
      scope,
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodeBranchCursor(sort, lastItem.createdAt, lastItem.id, lastItem.name)
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
