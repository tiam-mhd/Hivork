import type {
  BulkTagCustomersDto,
  BulkTagCustomersResponseDto,
  BulkUntagCustomersDto,
} from '@hivork/contracts/customers';

import { apiFetch } from '@/lib/api/client';

const DEMO_BULK_TAG = 'bulk-demo';

export async function bulkTagCustomers(
  payload: BulkTagCustomersDto,
): Promise<BulkTagCustomersResponseDto> {
  return apiFetch<BulkTagCustomersResponseDto>('/customers/bulk-tag', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bulkUntagCustomers(
  payload: BulkUntagCustomersDto,
): Promise<BulkTagCustomersResponseDto> {
  return apiFetch<BulkTagCustomersResponseDto>('/customers/bulk-untag', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export { DEMO_BULK_TAG };
