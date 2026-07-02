import type {
  CancelSaleDto,
  CancelSaleResponseDto,
  CollateralListResponseDto,
  ContractAttachmentListResponseDto,
  ContractVersionListResponseDto,
  GuarantorListResponseDto,
  SaleDetailEnterpriseDto,
  SaleLineItemDto,
} from '@hivork/contracts/installments';

import { apiFetch } from '@/lib/api/client';

export async function fetchSaleDetail(saleId: string): Promise<SaleDetailEnterpriseDto> {
  const response = await apiFetch<{ data: SaleDetailEnterpriseDto }>(
    `/sales/${saleId}?includeVersions=true&includeAttachments=true`,
  );
  return response.data;
}

export async function cancelSale(
  saleId: string,
  body: CancelSaleDto,
): Promise<CancelSaleResponseDto> {
  const response = await apiFetch<{ data: CancelSaleResponseDto }>(`/sales/${saleId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}

export async function fetchSaleLineItems(saleId: string): Promise<{ data: SaleLineItemDto[] }> {
  return apiFetch<{ data: SaleLineItemDto[] }>(`/sales/${saleId}/line-items`);
}

export async function fetchSaleGuarantors(saleId: string): Promise<GuarantorListResponseDto> {
  return apiFetch<GuarantorListResponseDto>(`/sales/${saleId}/guarantors`);
}

export async function fetchSaleCollaterals(saleId: string): Promise<CollateralListResponseDto> {
  return apiFetch<CollateralListResponseDto>(`/sales/${saleId}/collaterals`);
}

export async function fetchSaleAttachments(saleId: string): Promise<ContractAttachmentListResponseDto> {
  return apiFetch<ContractAttachmentListResponseDto>(`/sales/${saleId}/attachments`);
}

export async function fetchSaleVersions(saleId: string): Promise<ContractVersionListResponseDto> {
  return apiFetch<ContractVersionListResponseDto>(`/sales/${saleId}/versions`);
}
