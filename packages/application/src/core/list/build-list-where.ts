import type { FilterAst } from '@hivork/contracts/ui';

import type { FilterFieldMap } from '../filter/filter-ast-to-prisma.js';
import { filterAstToWhereClause } from '../filter/filter-ast-to-prisma.js';
import {
  normalizeSearchTerm,
  searchToWhere,
  type SearchFieldConfig,
} from '../filter/search-to-prisma.js';

export type BuildListWhereParams = {
  tenantId: string;
  search?: string;
  searchFields: SearchFieldConfig[];
  phoneNormalize?: (value: string) => string;
  filter?: FilterAst;
  fieldMap: FilterFieldMap;
};

/** Composes tenant guard, instant search, and filter AST for list queries. */
export function buildListWhere(params: BuildListWhereParams): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [
    { tenantId: params.tenantId, deletedAt: null },
  ];

  const normalizedSearch = normalizeSearchTerm(params.search, {
    phoneNormalize: params.phoneNormalize,
  });
  const searchWhere = searchToWhere(normalizedSearch, params.searchFields);
  if (searchWhere) {
    clauses.push(searchWhere);
  }

  if (params.filter) {
    const filterWhere = filterAstToWhereClause(params.filter, params.fieldMap);
    if (filterWhere) {
      clauses.push(filterWhere);
    }
  }

  if (clauses.length === 1) {
    return clauses[0]!;
  }

  return { AND: clauses };
}
