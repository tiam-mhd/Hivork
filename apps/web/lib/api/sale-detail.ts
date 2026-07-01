import type { CancelSaleDto, CancelSaleResponseDto } from '@hivork/contracts/installments';
import type { SaleDetailDto } from '@hivork/contracts/installments';

import { apiFetch } from '@/lib/api/client';

export async function fetchSaleDetail(saleId: string): Promise<SaleDetailDto> {
  return apiFetch<SaleDetailDto>(`/sales/${saleId}`);
}

export async function cancelSale(
  saleId: string,
  body: CancelSaleDto,
): Promise<CancelSaleResponseDto> {
  return apiFetch<CancelSaleResponseDto>(`/sales/${saleId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
