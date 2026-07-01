import { ApplicationError } from '../errors/application.error.js';

export type TenantCustomerCursorPayload = {
  id: string;
  createdAt?: string;
  name?: string | null;
  lastPurchaseAt?: string | null;
  overdueCount?: number;
};

export type TenantCustomerListSort =
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'name:asc'
  | 'name:desc'
  | 'lastPurchaseAt:desc'
  | 'lastPurchaseAt:asc'
  | 'overdueCount:desc'
  | 'overdueCount:asc';

export function encodeTenantCustomerCursor(
  sort: TenantCustomerListSort,
  item: {
    id: string;
    createdAt: Date;
    globalCustomer: { name: string | null };
    lastPurchaseAt: Date | null;
    overdueCount: number;
  },
): string {
  const payload: TenantCustomerCursorPayload = { id: item.id };

  switch (sort) {
    case 'createdAt:desc':
    case 'createdAt:asc':
      payload.createdAt = item.createdAt.toISOString();
      break;
    case 'name:asc':
    case 'name:desc':
      payload.name = item.globalCustomer.name;
      break;
    case 'lastPurchaseAt:desc':
    case 'lastPurchaseAt:asc':
      payload.lastPurchaseAt = item.lastPurchaseAt?.toISOString() ?? null;
      break;
    case 'overdueCount:desc':
    case 'overdueCount:asc':
      payload.overdueCount = item.overdueCount;
      break;
  }

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeTenantCustomerCursor(
  cursor: string,
  sort: TenantCustomerListSort,
): TenantCustomerCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as TenantCustomerCursorPayload;

    if (typeof parsed.id !== 'string') {
      throw new Error('invalid cursor shape');
    }

    switch (sort) {
      case 'createdAt:desc':
      case 'createdAt:asc':
        if (!parsed.createdAt || Number.isNaN(Date.parse(parsed.createdAt))) {
          throw new Error('invalid createdAt cursor');
        }
        break;
      case 'name:asc':
      case 'name:desc':
        if (parsed.name === undefined) {
          throw new Error('invalid name cursor');
        }
        break;
      case 'lastPurchaseAt:desc':
      case 'lastPurchaseAt:asc':
        if (parsed.lastPurchaseAt === undefined) {
          throw new Error('invalid lastPurchaseAt cursor');
        }
        if (parsed.lastPurchaseAt !== null && Number.isNaN(Date.parse(parsed.lastPurchaseAt))) {
          throw new Error('invalid lastPurchaseAt cursor');
        }
        break;
      case 'overdueCount:desc':
      case 'overdueCount:asc':
        if (typeof parsed.overdueCount !== 'number') {
          throw new Error('invalid overdueCount cursor');
        }
        break;
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
