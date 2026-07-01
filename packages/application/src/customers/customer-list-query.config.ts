import { normalizePhone } from '@hivork/contracts';

import type { FilterFieldMap } from '../core/filter/filter-ast-to-prisma.js';
import type { SearchFieldConfig } from '../core/filter/search-to-prisma.js';

/** Whitelisted instant-search fields for tenant customers (IFP-TASK-023). */
export const CUSTOMER_SEARCH_FIELDS: SearchFieldConfig[] = [
  {
    field: 'displayName',
    mode: 'contains',
    prismaPath: ['globalCustomer', 'name'],
  },
  {
    field: 'phone',
    mode: 'contains',
    prismaPath: ['globalCustomer', 'user', 'phone'],
    normalize: normalizePhone,
  },
  {
    field: 'customerCode',
    mode: 'contains',
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
