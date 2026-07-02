import { normalizePhone } from '@hivork/contracts';
import type { FilterAst } from '@hivork/contracts/ui';

import type { FilterFieldMap } from '../core/filter/filter-ast-to-prisma.js';
import { filterAstToWhereClause } from '../core/filter/filter-ast-to-prisma.js';
import { buildListWhere } from '../core/list/build-list-where.js';
import {
  escapeLikePattern,
  normalizeSearchTerm,
  searchToWhere,
  type SearchFieldConfig,
} from '../core/filter/search-to-prisma.js';

/** Safe prefix normalizer — does not throw on partial phone input during live search. */
function safePhoneSearchNormalize(value: string): string {
  try {
    return normalizePhone(value);
  } catch {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('9')) {
      return `0${digits}`;
    }

    return digits || value;
  }
}

/** Whitelisted instant-search fields for tenant customers (IFP-040). */
export const CUSTOMER_SEARCH_FIELDS: SearchFieldConfig[] = [
  {
    field: 'displayName',
    mode: 'contains',
    prismaPath: ['globalCustomer', 'name'],
  },
  {
    field: 'phone',
    mode: 'prefix',
    prismaPath: ['globalCustomer', 'user', 'phone'],
    normalize: safePhoneSearchNormalize,
  },
  {
    field: 'customerCode',
    mode: 'prefix',
    prismaPath: ['localCode'],
  },
];

/** Filter AST field map for tenant customer list queries. */
export const CUSTOMER_FILTER_FIELD_MAP: FilterFieldMap = {
  name: { prismaPath: 'globalCustomer.name', type: 'string' },
  phone: { prismaPath: 'globalCustomer.user.phone', type: 'string' },
  status: { prismaPath: 'globalCustomer.status', type: 'enum' },
  createdAt: { prismaPath: 'createdAt', type: 'date' },
  balanceRial: { prismaPath: 'totalPurchaseRial', type: 'money_rial' },
  branchId: { prismaPath: 'defaultBranchId', type: 'uuid' },
};

function buildSecondaryPhoneSearchClause(term: string): Record<string, unknown> | undefined {
  const digits = term.replace(/\D/g, '');
  if (digits.length < 4) {
    return undefined;
  }

  let phonePrefix = digits;
  try {
    phonePrefix = safePhoneSearchNormalize(term);
  } catch {
    phonePrefix = digits;
  }

  return {
    contactPhones: {
      some: {
        deletedAt: null,
        phone: { startsWith: escapeLikePattern(phonePrefix) },
      },
    },
  };
}

/** Live search OR clause — name, phone, local code, secondary phones (IFP-040). */
export function buildCustomerLiveSearchWhere(
  search: string | undefined,
): Record<string, unknown> | undefined {
  const term = normalizeSearchTerm(search, { phoneNormalize: normalizePhone });
  if (!term) {
    return undefined;
  }

  const base = searchToWhere(term, CUSTOMER_SEARCH_FIELDS);
  const secondary = buildSecondaryPhoneSearchClause(term);

  if (!base && !secondary) {
    return undefined;
  }

  if (!secondary) {
    return base;
  }

  if (!base?.OR) {
    return { OR: [secondary] };
  }

  return { OR: [...(base.OR as Record<string, unknown>[]), secondary] };
}

export function buildCustomerListWhere(params: {
  tenantId: string;
  search?: string;
  filter?: FilterAst;
}): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [{ tenantId: params.tenantId, deletedAt: null }];

  const searchWhere = buildCustomerLiveSearchWhere(params.search);
  if (searchWhere) {
    clauses.push(searchWhere);
  }

  if (params.filter) {
    const filterWhere = filterAstToWhereClause(params.filter, CUSTOMER_FILTER_FIELD_MAP);
    if (filterWhere) {
      clauses.push(filterWhere);
    }
  }

  if (clauses.length === 1) {
    return clauses[0]!;
  }

  return { AND: clauses };
}

/** @deprecated Use `buildCustomerListWhere` — kept for export helpers during migration */
export { buildListWhere };

/** Returns false when search is too short to execute (IFP-040: min 2 chars or phone prefix). */
export function isCustomerSearchActionable(search?: string): boolean {
  const trimmed = search?.trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.length >= 2) {
    return true;
  }

  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 4;
}
