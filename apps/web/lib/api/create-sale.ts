import type { CreateSaleDto, SaleDetailDto } from '@hivork/contracts/installments';

import { apiFetch } from '@/lib/api/client';

export function createSaleIdempotencyKey(): string {
  return crypto.randomUUID();
}

export async function createSale(
  body: CreateSaleDto,
  idempotencyKey: string,
): Promise<SaleDetailDto> {
  return apiFetch<SaleDetailDto>('/sales', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}
