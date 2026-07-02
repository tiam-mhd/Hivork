export type CustomerCategoryLookupResult =
  | { status: 'found'; categoryId: string }
  | { status: 'not_found' }
  | { status: 'ambiguous' };

export interface ICustomerCategoryReader {
  existsActiveInTenant(tenantId: string, categoryId: string): Promise<boolean>;
  resolveBySlugOrName(tenantId: string, value: string): Promise<CustomerCategoryLookupResult>;
}

export const CUSTOMER_CATEGORY_READER = Symbol('CUSTOMER_CATEGORY_READER');
